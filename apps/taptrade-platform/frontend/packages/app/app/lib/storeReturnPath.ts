/**
 * Validates the `?return=` context the Point Store carries back to a market
 * after a successful purchase (entry point: TradeTicket insufficient-balance
 * "Add Points" link → /store?return=/market/<ticker>).
 *
 * Same-origin absolute paths only — same rules as lib/safeReturnPath (LC-05)
 * — but with a null fallback instead of /predict: the store only renders the
 * "Return to market" action when a real, safe context exists.
 */
export function storeReturnPath(raw: string | null): string | null {
  if (!raw) return null;
  // Must start with a single slash; "//" is protocol-relative (open
  // redirect), and backslashes normalize to slashes in some browsers.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return null;
  }
  return raw;
}

/** Builds the `?return=` suffix for store entry links; "" when unsafe. */
export function storeReturnSuffix(raw: string | null): string {
  const safe = storeReturnPath(raw);
  return safe ? `?return=${encodeURIComponent(safe)}` : "";
}
