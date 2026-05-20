"use client";

/**
 * Wrap `fetch` with the auth headers that the Go gateway's admin routes
 * require. Consolidates three things that App Router admin pages kept
 * getting wrong:
 *
 *   1. `credentials: "include"` — same-origin /api/v1/* fetches need this
 *      to be explicit, otherwise the access_token (HttpOnly) cookie is
 *      not forwarded across the Next.js rewrite proxy to the gateway and
 *      every admin request returns 401.
 *
 *   2. `X-Admin-Role: admin` — backoffice convention header. Not enforced
 *      by the gateway in itself, but kept for parity with prior call
 *      sites and easy server-side log filtering.
 *
 *   3. `X-CSRF-Token` for mutations — gateway's httpx.CSRF middleware
 *      enforces a double-submit pair (cookie value === header value) on
 *      every state-changing admin call. The login proxy at
 *      app/api/auth/login/route.ts mints the `csrf_token` cookie
 *      non-HttpOnly so this helper can read it from document.cookie.
 *
 * The helper is intentionally a thin shim, not a full client. It accepts
 * the same arguments as `fetch` and returns the same Promise<Response>.
 * Callers handle response parsing and error mapping themselves so each
 * page can shape errors however its UI needs.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function readCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function adminFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (!headers.has("X-Admin-Role")) {
    headers.set("X-Admin-Role", "admin");
  }

  if (!SAFE_METHODS.has(method) && !headers.has("X-CSRF-Token")) {
    const csrf = readCsrfToken();
    if (csrf) {
      headers.set("X-CSRF-Token", csrf);
    }
  }

  return fetch(input, {
    ...init,
    credentials: init.credentials ?? "include",
    headers,
  });
}
