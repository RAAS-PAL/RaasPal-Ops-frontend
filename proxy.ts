/**
 * proxy.ts  (Next.js 16 — replaces the deprecated middleware.ts)
 *
 * WHY proxy.ts, not middleware.ts?
 * Next.js 16 renamed the file convention from `middleware` to `proxy` to
 * clarify its network-boundary role.  The exported function must be named
 * `proxy` (or be the default export).  The old `middleware` export still
 * works but is deprecated and emits a warning.
 *
 * WHAT it does:
 * 1. Auth guard — if the request has no JWT in the cookie (raaspal_token)
 *    and the path is not a public route, redirect to /[locale]/login.
 *    NOTE: We use an httpOnly cookie for SSR auth checks (set by the login
 *    page after receiving the token from the API).  The Zustand store +
 *    localStorage handle client-side state; the cookie provides the edge
 *    signal for the proxy layer.
 *
 * 2. i18n routing — next-intl handles locale detection and prefix injection.
 *
 * Public paths that bypass the auth check:
 *   /[locale]/login   — the login page itself
 *   /_next/*          — Next.js internals
 *   /api/*            — we don't proxy backend API calls here
 *   /favicon.ico etc. — static assets
 */
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

// Build the handler once at module level (no per-request overhead).
const handleI18nRouting = createMiddleware(routing);

/** Paths that do NOT require a JWT. Matched against the path after locale strip. */
// `/report` is public: customers open their monthly report from an email link
// and have no account. The token in /report/<token> is the access control.
const PUBLIC_PATHS = ['/login', '/report'];

/** Returns true if the path (locale stripped) is a public route. */
function isPublic(pathname: string): boolean {
  // Strip locale prefix: /en/login → /login
  const stripped = pathname.replace(/^\/(?:en|th)/, '') || '/';
  return PUBLIC_PATHS.some((p) => stripped === p || stripped.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always let i18n handle the routing first — it may redirect / → /en
  const i18nResponse = handleI18nRouting(request);

  // If i18n already issued a redirect, honour it (locale normalisation).
  if (i18nResponse && i18nResponse.status >= 300 && i18nResponse.status < 400) {
    return i18nResponse;
  }

  // Public paths bypass the auth check.
  if (isPublic(pathname)) {
    return i18nResponse ?? NextResponse.next();
  }

  // Check for the auth cookie set by the login page.
  const token = request.cookies.get('raaspal_token')?.value;
  if (!token) {
    // Determine target locale from the pathname prefix.
    const localeMatch = pathname.match(/^\/(en|th)/);
    const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return i18nResponse ?? NextResponse.next();
}

export const config = {
  /*
   * Run on all routes EXCEPT:
   *  – Next.js internals  (_next/*)
   *  – Static files that have a file extension  (favicon.ico, *.svg, etc.)
   * The negative-lookahead keeps proxy fast: it only fires on real page routes.
   */
  matcher: [
    '/((?!_next|api|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
