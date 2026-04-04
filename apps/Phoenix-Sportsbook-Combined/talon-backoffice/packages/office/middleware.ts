/**
 * Next.js Middleware - Backoffice Authentication
 * Protects all routes except /auth/* from unauthenticated access
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Get auth token from request
 */
function getAuthToken(request: NextRequest): string | null {
  // Check cookies first
  const token = request.cookies.get('authToken')?.value;
  if (token) {
    return token;
  }

  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

/**
 * Middleware function
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = getAuthToken(request);

  // Allow auth routes without authentication
  if (pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Matcher config - specify which routes to run middleware on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt (robots file)
     * - sitemap.xml (sitemap file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
