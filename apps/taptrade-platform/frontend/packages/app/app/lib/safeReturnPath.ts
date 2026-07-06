/**
 * Validates a returnUrl query param before it is honored as a redirect
 * target. We accept only same-origin absolute paths so a crafted auth
 * link cannot bounce a user to an attacker-controlled URL after sign-in
 * or registration. Shared by the login and register pages so the check
 * cannot diverge between them (LC-05).
 */
export function safeReturnPath(raw: string | null): string {
  if (!raw) return "/predict";
  // Must start with a single slash and not include "//" (protocol-relative)
  // or backslashes (some browsers normalize them to forward slashes).
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return "/predict";
  }
  return raw;
}

/**
 * Builds a `?returnUrl=…` suffix to thread a *validated* same-origin
 * returnUrl through the auth pages. Returns "" when there is no param or
 * it is not a safe same-origin path, so we never forward a junk/unsafe
 * value (the final honor site still re-validates via safeReturnPath).
 */
export function returnUrlSuffix(raw: string | null): string {
  if (!raw || safeReturnPath(raw) !== raw) return "";
  return `?returnUrl=${encodeURIComponent(raw)}`;
}
