# FutureYou — Security Reference

**Version:** 1.0
**Last Updated:** 2026-03-28

This document describes the security model of FutureYou, including authentication, route protection, credential handling, and data isolation.

---

## 1. Authentication

FutureYou uses NextAuth v5 with a credentials provider. All session management is handled by the library; tokens are never constructed manually.

### 1.1 Authentication Flow

```
User submits email and password
         |
         v
POST /api/auth/signin (NextAuth handler)
         |
         v
NextAuth calls the credentials provider's authorize() function
  - Fetches User record by email from PostgreSQL
  - Compares submitted password against stored bcrypt hash
  - Returns User object on match; returns null on failure
         |
         v
On success: NextAuth generates a signed JWT
  - Signed with AUTH_SECRET (environment variable)
  - Stored as an HttpOnly cookie
  - Session contains: { userId, email, name }
         |
         v
On failure: NextAuth returns an authentication error
  - No token is issued
  - No information is revealed about whether the email exists
```

### 1.2 Password Storage

Passwords are never stored in plaintext. On registration:

```
User submits password
         |
         v
bcrypt.hash(password, saltRounds=10)
         |
         v
Hash stored in User.passwordHash
```

On login:

```
bcrypt.compare(submittedPassword, User.passwordHash)
```

The bcrypt work factor of 10 is the standard production default, producing hashes in approximately 100ms on modern hardware. This rate-limits brute-force attempts at the compute layer.

### 1.3 Session Tokens

Sessions are JWT-based. Tokens are:

- Signed using `HMAC-SHA256` with the `AUTH_SECRET` value
- Stored in an `HttpOnly` cookie (not accessible to JavaScript)
- Transmitted only over HTTPS in production
- Verified on every request by the NextAuth middleware

Rotating `AUTH_SECRET` immediately invalidates all active sessions, which serves as an emergency mechanism for invalidating sessions in bulk.

---

## 2. Route Protection

All application routes under `/(app)` and `/(onboarding)` are protected. Unauthenticated requests are redirected to `/login` before the page renders.

### 2.1 Middleware Enforcement

Protection is implemented in `src/middleware.ts`, which runs on every incoming request via the Next.js middleware layer.

```
Incoming request
         |
         v
middleware.ts reads the NextAuth session cookie
         |
         +-- Cookie valid and not expired
         |         |
         |         v
         |   Request forwarded to the Next.js page or route handler
         |
         +-- Cookie missing, invalid, or expired
                   |
                   v
              Path is /(app)/* or /(onboarding)/*?
                   |
                   +-- Yes --> HTTP 302 redirect to /login
                   |
                   +-- No (/(auth)/*, /api/auth/*) --> Request proceeds
```

### 2.2 API Route Authorization

Middleware alone does not protect API routes from direct HTTP requests that supply a valid cookie. Each API route handler independently verifies the session:

```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

This dual enforcement (middleware for pages, explicit check for API routes) ensures that no protected resource can be accessed without a valid session.

---

## 3. Data Isolation

All application data is scoped to a `userId`. The database schema enforces this at the foreign key level, but query-level isolation is the responsibility of each API route handler.

### 3.1 Ownership Verification Pattern

Every route that reads or modifies a record by ID follows this pattern:

```
1. Read the session userId
2. Fetch the record by its primary key
3. Compare record.userId to session.userId
4. If they do not match, return HTTP 403 (Forbidden)
5. If they match, proceed with the operation
```

This prevents users from accessing or modifying records belonging to other users, even if they know the record ID.

### 3.2 Cross-User Access Vectors

The following are explicitly guarded against:

| Attack Vector | Guard |
|---|---|
| Guessing another user's record ID | Ownership check (step 3 above) returns HTTP 403 |
| Enumerating records via list endpoints | All list queries include `WHERE userId = session.userId` |
| Accessing unauthenticated API routes | Every route handler calls `auth()` before processing |
| Session hijacking via cookie theft | HttpOnly cookie prevents JavaScript access; HTTPS prevents transit interception |

---

## 4. Credential and Key Management

### 4.1 Environment Variables

All secrets are stored in environment variables. No secrets appear in source code, configuration files, or git history.

| Variable | Description | Exposure |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string with credentials | Server only |
| `AUTH_SECRET` | JWT signing secret | Server only |
| `NEXTAUTH_URL` | Application base URL | Server only |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI insights | Server only |

### 4.2 Anthropic API Key Isolation

The Anthropic API key is consumed exclusively inside `src/app/api/ai/insights/route.ts`, a Next.js Route Handler. Route Handlers execute only on the server and are never included in the client JavaScript bundle.

```
Browser client
  --> POST /api/ai/insights (with session cookie)
  --> Next.js server verifies session
  --> Server reads process.env.ANTHROPIC_API_KEY
  --> Server calls Anthropic API
  --> Server returns insight text to browser

The browser never sees the key at any stage of this process.
```

This contrasts with a pattern where the key is embedded in a Next.js API route that is imported into a client component — which would cause the key to appear in the client bundle during the build step.

### 4.3 Key Rotation

| Key | Rotation Effect |
|---|---|
| `AUTH_SECRET` | All active sessions are immediately invalidated; all users must log in again |
| `ANTHROPIC_API_KEY` | AI insights stop working until the new key is deployed; rule-based insights continue functioning |
| `DATABASE_URL` | Application cannot connect to the database until the new URL is deployed |

---

## 5. Input Validation

### 5.1 API Route Validation

All API route handlers validate incoming request bodies before processing. Invalid or missing fields return HTTP 400 with a descriptive error message.

Required field checks are performed before any database query is executed. This prevents partial writes and avoids leaking database error messages to clients.

### 5.2 SQL Injection Prevention

All database queries are executed through Prisma's parameterized query builder. Raw SQL is not used anywhere in the application. Prisma does not allow dynamic table or column names, eliminating the class of SQL injection attacks that parameterization alone cannot prevent.

### 5.3 Client-Side Validation

The onboarding and plan pages include client-side input validation (numeric fields, non-negative values, required fields). This validation is for user experience only and does not replace server-side validation. The server always re-validates regardless of client-side state.

---

## 6. HTTPS and Transport Security

In production, HTTPS is enforced at the hosting provider level (Vercel). The NextAuth session cookie is marked `Secure`, meaning it is not transmitted over unencrypted connections.

In local development over `http://localhost`, the `Secure` flag is omitted automatically by NextAuth to allow the application to function.

---

## 7. Dependency Security

The project uses `npm` for package management. The `package-lock.json` file is committed to the repository, ensuring that all developers and deployment environments install identical dependency versions.

Dependency vulnerabilities should be audited with:

```bash
npm audit
```

Critical vulnerabilities in authentication, session management, or database access dependencies should be patched before any production deployment.

---

## 8. Security Checklist for Deployment

Before deploying to a production environment, verify the following:

| Item | Requirement |
|---|---|
| `AUTH_SECRET` | Set to a randomly generated 32-byte value; not reused from development |
| `DATABASE_URL` | Points to the production database; not a shared or development instance |
| `ANTHROPIC_API_KEY` | Scoped to production usage limits in the Anthropic console |
| `NEXTAUTH_URL` | Set to the exact production URL including protocol (`https://`) |
| HTTPS | Enforced at the hosting provider; HTTP requests redirected to HTTPS |
| Database access | Database not publicly accessible; only accessible from the application server's IP or VPC |
| Environment variables | Not committed to version control; stored in hosting provider's secrets management |
| `npm audit` | No critical vulnerabilities in production dependencies |
