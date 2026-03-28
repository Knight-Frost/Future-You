import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_ROUTES = ['/', '/login', '/register'];

// ─── Simple in-memory rate limiter ────────────────────────────────────────────
// Works for single-instance deployments (e.g. Railway, Render, Heroku).
// For multi-instance production: replace with @upstash/ratelimit + Redis.
//
// Limits per route group:
//   /api/auth/*        — 10 requests / minute per IP  (brute-force guard)
//   /api/ai/insights   — 5  requests / minute per user (cost guard)
//   All other API      — 60 requests / minute per IP  (general DoS guard)

type RateBucket = { count: number; resetAt: number };

const rateLimitStore = new Map<string, RateBucket>();

interface RateRule {
  match: (pathname: string) => boolean;
  max: number;
  windowMs: number;
  keyFn: (req: NextRequest) => string;
}

const RATE_RULES: RateRule[] = [
  {
    match: (p) => p.startsWith('/api/auth'),
    max: 10,
    windowMs: 60_000,
    keyFn: (req) => `auth:${req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'}`,
  },
  {
    match: (p) => p.startsWith('/api/ai'),
    max: 5,
    windowMs: 60_000,
    keyFn: (req) => `ai:${req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'}`,
  },
  {
    match: (p) => p.startsWith('/api/'),
    max: 60,
    windowMs: 60_000,
    keyFn: (req) => `api:${req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'}`,
  },
];

function checkRateLimit(req: NextRequest, pathname: string): boolean {
  const rule = RATE_RULES.find((r) => r.match(pathname));
  if (!rule) return true; // no rule — allow

  const key = rule.keyFn(req);
  const now = Date.now();
  const bucket = rateLimitStore.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + rule.windowMs });
    return true;
  }

  if (bucket.count >= rule.max) return false;

  bucket.count += 1;
  return true;
}

// Prune stale buckets periodically to prevent unbounded memory growth
let lastPrune = Date.now();
function maybePruneStore() {
  const now = Date.now();
  if (now - lastPrune < 5 * 60_000) return; // prune at most every 5 minutes
  lastPrune = now;
  for (const [key, bucket] of rateLimitStore) {
    if (now > bucket.resetAt) rateLimitStore.delete(key);
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  maybePruneStore();

  // Rate limiting — checked before auth to also protect public auth endpoints
  if (!checkRateLimit(req, pathname)) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please slow down.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      },
    );
  }

  // Allow API auth routes always
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Allow static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  const isLoggedIn = !!token;
  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // Root — send logged-in users to the app; unauthenticated users see the landing page.
  if (pathname === '/') {
    if (isLoggedIn) return NextResponse.redirect(new URL('/dashboard', req.url));
    return NextResponse.next();
  }

  // Protect non-public routes from unauthenticated access
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Onboarding gate is intentionally NOT enforced here.
  // getToken() only decodes the cookie — it never re-queries the DB,
  // so onboardingDone in the token is always the value from login time.
  // The (app)/layout.tsx uses auth() which runs the JWT callback and
  // reads the DB fresh, correctly gating /dashboard and all app routes.

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
