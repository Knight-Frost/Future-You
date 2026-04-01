# FutureYou — Setup and Deployment Guide

**Version:** 1.0
**Last Updated:** 2026-03-28

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js App Router | 14 | Full-stack React with server components and API routes |
| Language | TypeScript | 5 (strict) | Type-safe financial engine and client code |
| Styling | Tailwind CSS + CSS Variables | 3 | Semantic design system with custom property tokens |
| Authentication | NextAuth.js | v5 | JWT sessions with credentials provider |
| Database | PostgreSQL | 15+ | Relational persistence for users, goals, and transactions |
| ORM | Prisma | 5 | Type-safe query client with auto-generated types |
| Client State | Zustand | 5 | Lightweight reactive store with localStorage persistence |
| AI | Inference API | — | Server-side only; key is never exposed to the browser |

---

## Prerequisites

- Node.js 18.17 or later
- npm 9 or later
- PostgreSQL 15 or later (local or hosted)
- An insights API key (required for personalized insights; rule-based insights work without it)

---

## Local Development

### 1. Clone and install dependencies

```bash
git clone https://github.com/Knight-Frost/Future-You.git
cd Future-You
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with the following values:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/futureyou` |
| `AUTH_SECRET` | Random secret for JWT signing | Output of `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Base URL of the application | `http://localhost:3000` |
| `INSIGHTS_API_KEY` | API key for personalized insights | `sk-...` |

The `INSIGHTS_API_KEY` is optional for development. Without it, the personalized insight layer will be skipped and rule-based insights will remain visible.

### 3. Set up the database

**Option A — Supabase (recommended for new projects)**

1. Create a project at supabase.com
2. Go to Project Settings > Database > Connection string (URI mode)
3. Copy the connection string and set it as `DATABASE_URL`

**Option B — Local PostgreSQL**

```bash
createdb futureyou
# Set DATABASE_URL="postgresql://localhost:5432/futureyou"
```

### 4. Apply schema and seed demo data

```bash
npm run db:generate   # Generate the Prisma client from schema.prisma
npm run db:push       # Apply the schema to the database (no migration files)
npm run db:seed       # Seed the demo account and example data
```

The seed creates a demo account: `demo@futureyou.app` / `demo123456`

### 5. Start the development server

```bash
npm run dev
```

The application is available at `http://localhost:3000`.

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| Development server | `npm run dev` | Starts Next.js in development mode with hot reload |
| Production build | `npm run build` | Compiles and optimizes the application for production |
| Production server | `npm run start` | Starts the compiled production server |
| Type check | `npx tsc --noEmit` | Validates TypeScript without emitting files |
| Lint | `npm run lint` | Runs ESLint across the project |
| Generate Prisma client | `npm run db:generate` | Regenerates the Prisma client after schema changes |
| Push schema | `npm run db:push` | Applies schema changes to the database without migration files |
| Seed database | `npm run db:seed` | Runs `prisma/seed.ts` to populate demo data |

---

## Production Deployment

### Vercel (recommended)

FutureYou is designed for deployment on Vercel with a hosted PostgreSQL database.

#### Step 1 — Database

Provision a PostgreSQL database. Recommended providers:

| Provider | Notes |
|---|---|
| Supabase | Free tier available; connection pooling via PgBouncer |
| Railway | Simple setup; automatic backups |
| Neon | Serverless PostgreSQL; scales to zero |

Copy the connection string in URI format (not pooled) for use with Prisma.

#### Step 2 — Deploy

```bash
npx vercel
```

Alternatively, connect the GitHub repository in the Vercel dashboard for automatic deployments on push to `main`.

#### Step 3 — Environment variables

Set the following in the Vercel project dashboard under Settings > Environment Variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Production PostgreSQL connection string |
| `AUTH_SECRET` | Random 32-byte secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Production URL (e.g., `https://futureyou.vercel.app`) |
| `INSIGHTS_API_KEY` | Production insights API key |

#### Step 4 — Apply schema to production

```bash
DATABASE_URL="your-production-url" npx prisma migrate deploy
```

Or for the initial push without migration files:

```bash
DATABASE_URL="your-production-url" npx prisma db push
```

---

## Project Structure

```
Future-You/
├── prisma/
│   ├── schema.prisma          # Database schema — all models and relations
│   └── seed.ts                # Demo data seeder
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/         # Login page
│   │   │   └── register/      # Registration page
│   │   │
│   │   ├── (onboarding)/
│   │   │   └── onboarding/    # 4-step onboarding wizard
│   │   │
│   │   ├── (app)/             # Protected application pages
│   │   │   ├── dashboard/     # Financial overview and AI insight
│   │   │   ├── plan/          # Full financial input form
│   │   │   ├── debt/          # Debt strategy and payoff analysis
│   │   │   ├── goals/         # Goal management and savings rate
│   │   │   ├── simulator/     # Interactive what-if modeling
│   │   │   ├── insights/      # Rule-based and AI insight history
│   │   │   ├── analytics/     # Charts, stat cards, CSV/PDF export
│   │   │   ├── history/       # Saved snapshots and trend view
│   │   │   ├── transactions/  # CSV import and transaction classification
│   │   │   ├── settings/      # Application and profile settings
│   │   │   └── profile/       # Account management
│   │   │
│   │   ├── api/
│   │   │   ├── auth/          # NextAuth route handler
│   │   │   ├── ai/insights/   # Server-side AI insight generation
│   │   │   ├── goals/         # Goal CRUD
│   │   │   ├── scenarios/     # Scenario save and retrieve
│   │   │   ├── strategies/    # Strategy generation and retrieval
│   │   │   ├── transactions/  # Import, classify, and manage transactions
│   │   │   ├── expense-rules/ # User-defined classification rules
│   │   │   ├── profile/       # Financial profile sync
│   │   │   ├── settings/      # User settings
│   │   │   └── onboarding/    # Onboarding data persistence
│   │   │
│   │   ├── globals.css        # Design tokens and base styles
│   │   └── layout.tsx         # Root layout with providers
│   │
│   ├── engine/
│   │   ├── calculator.ts      # Pure financial math (projection, amortization, FV)
│   │   ├── insights.ts        # Rule-based insight engine and AI prompt builder
│   │   ├── optimizer.ts       # Debt strategy generator with feasibility decomposition
│   │   └── expense/
│   │       ├── classification.ts  # Transaction category classifier
│   │       ├── normalization.ts   # Merchant name normalizer
│   │       └── pipeline.ts        # End-to-end import pipeline
│   │
│   ├── stores/
│   │   └── useFinancialStore.ts   # Zustand store with localStorage persistence
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx   # Sidebar + main content shell
│   │   │   └── Sidebar.tsx    # Navigation with route-aware active state
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Slider.tsx
│   │       ├── MetricCard.tsx
│   │       ├── CSVImport.tsx
│   │       ├── FinancialGreeting.tsx
│   │       └── FutureHeroSlideshow.tsx
│   │
│   ├── lib/
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── prisma.ts          # Singleton Prisma client
│   │   └── utils.ts           # formatCurrency, formatPercent, formatMonths, cn
│   │
│   ├── middleware.ts           # Route protection — redirects unauthenticated users
│   └── types/
│       └── index.ts           # All shared TypeScript interfaces and types
│
├── public/
│   └── backgrounds/           # Hero slideshow images
│
├── .env.example               # Environment variable template
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Architecture Notes

### Why Next.js over a separate frontend/backend

Next.js App Router eliminates CORS configuration, simplifies deployment to a single process, and provides server components for fast initial renders. API routes give the backend access needed for database queries and the insights API key without a separate Express server.

### Why Zustand over React Context

React Context re-renders the entire consumer tree on every state change. Zustand uses selective subscriptions — a component that reads `projection.debtPayoffMonths` only re-renders when that specific value changes. This is essential for real-time slider performance.

### Why the AI key is server-side only

The Anthropic API key is read from `process.env.ANTHROPIC_API_KEY` inside a Next.js route handler (`/api/ai/insights`). It is never included in the client bundle. Exposing the key in the browser would allow any visitor to make API calls at the account's expense.

### Why localStorage for financial inputs

Financial inputs and simulator sliders are persisted to `localStorage` so users can return to their session without re-entering data. The database is only written when users explicitly save their profile from the Plan page. This separation means the real-time simulation loop has zero latency and zero network dependency.

---

## Design System

All colors are defined as CSS custom properties in `src/app/globals.css`. Components use these variables rather than hardcoded values.

| Variable | Usage |
|---|---|
| `var(--primary)` | Emerald green (#16a34a) — primary actions and accents |
| `var(--royal-gradient)` | Dark-to-light emerald gradient — hero and sidebar backgrounds |
| `var(--gold-light)` | Gold (#E8CC7A) — result rows in math tooltips |
| `var(--foreground)` | Primary text color |
| `var(--muted-foreground)` | Secondary text color |
| `var(--border)` | Card and separator borders |
| `var(--surface-primary-bg)` | Card background with backdrop blur |
| `var(--success)` | Green status indicator |
| `var(--warning)` | Amber status indicator |
| `var(--danger)` | Red status indicator |

Animations use a CSS `pageIn` keyframe applied to the inner `<div>` of each page. Framer Motion is not used in the main application. Tailwind arbitrary values are avoided in favor of inline `style={}` objects when referencing CSS custom properties.

---

## Security Notes

| Concern | Mitigation |
|---|---|
| API key exposure | `INSIGHTS_API_KEY` is read server-side only; never included in client bundles |
| Route protection | `src/middleware.ts` enforces authentication on all app and onboarding routes |
| Password storage | Passwords are hashed using bcrypt before storage in `User.passwordHash` |
| Session integrity | JWT sessions are signed with `AUTH_SECRET`; secret rotation invalidates all sessions |
| SQL injection | All database queries run through Prisma's parameterized query builder |
