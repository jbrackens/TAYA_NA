// Server-side base URL for office → gateway calls (AI draft route, plan §16).
//
// The deployed office container sets NEXT_PUBLIC_API_URL="" so the BROWSER talks
// to the gateway same-origin via Caddy. But the draft API route runs INSIDE the
// office container, and a server-side fetch can't use "" — the old
// `NEXT_PUBLIC_API_URL || "http://localhost:18080"` fell back to localhost:18080
// inside the office container, where nothing listens, so the budget pre-flight
// failed closed (503) and drafting never worked on the box. Prefer an explicit
// internal service URL (GATEWAY_INTERNAL_URL=http://gateway:18080 on the box) —
// the same fix the auth login proxy uses (NEXT_PUBLIC_AUTH_URL=http://auth:18081).
//
// `env` is injectable so the precedence is unit-testable without mutating globals.
export function gatewayBaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  return (
    env.GATEWAY_INTERNAL_URL ||
    env.NEXT_PUBLIC_API_URL ||
    "http://localhost:18080"
  );
}
