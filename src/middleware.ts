import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_ROUTES = ['/login', '/register'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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

  // Root redirect — always send logged-in users to dashboard;
  // the app layout handles the onboarding gate via auth() (fresh DB read).
  if (pathname === '/') {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.url));
    return NextResponse.redirect(new URL('/dashboard', req.url));
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
