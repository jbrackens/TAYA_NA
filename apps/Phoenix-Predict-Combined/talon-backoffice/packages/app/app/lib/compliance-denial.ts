/**
 * Classify gateway 403 reasons from the compliance gates so the trade
 * ticket and cashier can render a jurisdiction/KYC banner instead of a
 * generic error line. The matched phrases come from the gateway:
 *
 *   internal/compliance/geo_gate.go
 *     "service not available in your jurisdiction"
 *     "service not available: jurisdiction could not be verified"
 *   internal/http/pretrade_gate.go + internal/payments/handlers.go
 *     "identity verification required to trade — …"
 *     "identity verification required to withdraw above this amount — …"
 *     "identity verification unavailable; trading blocked"
 *     "identity verification unavailable; withdrawal blocked"
 *
 * Keep the matching loose (substring, case-insensitive): the reasons are
 * user-facing copy and may grow variants; misclassifying as null only
 * degrades to the plain error style.
 */

export type ComplianceDenialKind = "jurisdiction" | "kyc";

export function complianceDenialKind(
  message: string,
): ComplianceDenialKind | null {
  const m = message.toLowerCase();
  if (m.includes("jurisdiction")) return "jurisdiction";
  if (m.includes("identity verification")) return "kyc";
  return null;
}
