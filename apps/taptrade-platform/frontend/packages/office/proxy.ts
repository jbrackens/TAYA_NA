/**
 * Next.js Proxy - Backoffice authenticated-session guard.
 *
 * Next 16 renamed `middleware` -> `proxy`; this is the single office-wide gate.
 * It protects every route except /auth/* (and the matcher's static/asset/API
 * exclusions) from unauthenticated access.
 *
 * P2-12 (audit P0-8 / ARCH-03): previously this only checked that a session
 * cookie was PRESENT, so a forged or expired token still rendered the full
 * admin shell. Now, when a token is present, the request is additionally
 * validated SERVER-SIDE against the auth session endpoint (the same source of
 * truth the Go gateway uses) before it is allowed through — an invalid or
 * expired session is redirected to the staff login, not served the shell.
 *
 * Defense in depth: Caddy basic-auth stays on the demo box as the outer gate,
 * and every gateway API independently enforces auth + RBAC. This proxy is the
 * application shell gate, never the sole control — so it deliberately fails
 * SAFE: an unreachable auth backend degrades to the prior presence check rather
 * than locking every admin out (the audit's stated misconfig risk). The hard
 * dev / backend-less escape hatch is OFFICE_AUTH_GUARD_DISABLED=true.
 */

import { NextRequest, NextResponse } from "next/server";

const RETIRED_MONEY_ROUTE_PATTERN =
  /^\/(?:cashier|cashout|crypto|deposit|deposits|fiat|payment|payments|prize|prizes|redeem|redemption|withdraw|withdrawal|withdrawals)(?:\/|$)/i;

function isRetiredMoneyRoute(pathname: string): boolean {
  return RETIRED_MONEY_ROUTE_PATTERN.test(pathname);
}

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

// Validate the session against the gateway's auth proxy. The office runs as a
// Next standalone Node server, so this reads RUNTIME env: GATEWAY_INTERNAL_URL
// (http://gateway:18080 on the compose network) — a NON-public var, so it is
// read live rather than inlined-empty at build the way NEXT_PUBLIC_* would be.
// The gateway forwards /api/v1/auth/* to the auth service, whose session
// handler accepts the access_token cookie or an Authorization: Bearer token;
// we send both so either path validates.
//
// Returns true = valid (200), false = explicitly rejected (e.g. 401/403),
// null = auth backend unreachable. `null` is treated by the caller as
// "degrade to the presence check" so a transient outage or URL misconfig can
// never hard-lock the office.
async function validateSession(
  request: NextRequest,
  token: string,
): Promise<boolean | null> {
  const base =
    process.env.OFFICE_SESSION_VALIDATE_URL ||
    process.env.GATEWAY_INTERNAL_URL ||
    "http://localhost:18080";
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/v1/auth/session`, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest, pathname: string): NextResponse {
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("returnUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  // Hard escape hatch for local dev / a backend-less environment. Gated to
  // non-production so a stray OFFICE_AUTH_GUARD_DISABLED=true can never open
  // the admin shell in prod (instrumentation.ts also refuses boot in that case).
  if (
    process.env.OFFICE_AUTH_GUARD_DISABLED === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  if (isRetiredMoneyRoute(pathname)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // The login screen and the rest of /auth/* must stay open (no redirect loop).
  if (pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  const token = getAuthToken(request);

  // No credential at all -> straight to login, no backend round-trip.
  if (!token) {
    return redirectToLogin(request, pathname);
  }

  // Credential present -> validate it server-side. Only an EXPLICIT rejection
  // bounces the request; an unreachable backend (null) degrades to the prior
  // presence check (token present => allow) so the office is never hard-locked.
  const valid = await validateSession(request, token);
  if (valid === false) {
    return redirectToLogin(request, pathname);
  }

  // Fail CLOSED in production when the validator is unreachable (null): a
  // forged/expired token must not be served the shell just because the auth
  // backend is down or misconfigured. In dev we keep the prior fail-OPEN
  // degrade-to-presence-check behaviour so a backend-less environment still
  // works.
  if (valid === null && process.env.NODE_ENV === "production") {
    return redirectToLogin(request, pathname);
  }

  return NextResponse.next();
}

export const config = {
  // Skip API, Next internals, and static asset files. The trailing
  // alternative `[^/]+\\.[a-zA-Z0-9]+` skips any path whose final segment
  // contains a dot — i.e. file requests like /favicon.ico, /images/foo.svg,
  // /favicon.ico. Without this the proxy was redirecting public/*.png to
  // /auth/login, breaking the login screen's own logo.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpe?g|gif|svg|ico|webp|css|js|woff2?|map)$).*)",
  ],
};
