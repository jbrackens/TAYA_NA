/**
 * Next.js Proxy - Authentication and Route Protection
 * Protects private routes and redirects to login when necessary
 */

import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/", "/sports", "/match", "/fixtures", "/live", "/starting-soon", "/auth"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function getAuthToken(request: NextRequest): string | null {
  // Check HttpOnly access_token cookie (current auth) or legacy authToken cookie
  const accessToken = request.cookies.get("access_token")?.value;
  if (accessToken) {
    return accessToken;
  }

  const legacyToken = request.cookies.get("authToken")?.value;
  if (legacyToken) {
    return legacyToken;
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

  if (isPublicRoute(pathname)) {
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
    "/((?!api|_next/static|_next/image|static|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
