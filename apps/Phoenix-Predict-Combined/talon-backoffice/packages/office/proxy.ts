/**
 * Next.js Proxy - Backoffice Authentication
 * Protects all routes except /auth/* from unauthenticated access
 */

import { NextRequest, NextResponse } from "next/server";

function getAuthToken(request: NextRequest): string | null {
  const token = request.cookies.get("authToken")?.value;
  if (token) {
    return token;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = getAuthToken(request);

  if (pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
