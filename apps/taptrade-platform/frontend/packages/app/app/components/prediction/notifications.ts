/**
 * Settlement notices — pure helpers (no React).
 *
 * The gateway's settlement payouts seam pushes one payload per position
 * holder (WS portfolio channel) and persists the same payload in the
 * notification inbox. The client renders BOTH from this one mapping:
 * payload → i18n key + params, so every locale reads settlement outcomes
 * in its own words while the server stays copy-free.
 */

export interface SettlementNoticePayload {
  type?: string;
  kind?: string;
  marketId?: string;
  ticker?: string;
  title?: string;
  result?: string;
  side?: string;
  quantity?: number;
  payoutPoints?: number;
  pnlPoints?: number;
  ts?: string;
}

export interface SettlementNotice {
  /** i18n key in the `header` namespace. */
  titleKey: string;
  /** Interpolation params for the title key. */
  params: Record<string, string | number>;
  /** Plain-data body: the market's (already localized-at-source) title. */
  body: string;
}

/**
 * Maps a settlement payload to its i18n rendering, or null when the
 * payload is not a settlement event (foreign portfolio events flow on
 * the same channel and must be ignored, not mis-rendered).
 */
export function settlementNotice(
  payload: unknown,
): SettlementNotice | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as SettlementNoticePayload;
  if (p.type !== "settlement" || !p.kind) return null;
  const result = (p.result || "").toUpperCase();
  const points = typeof p.payoutPoints === "number" ? p.payoutPoints : 0;
  const body = p.title || p.ticker || "";
  switch (p.kind) {
    case "settlement_paid":
      return {
        titleKey: "SETTLEMENT_TOAST_PAID_TITLE",
        params: { result, points },
        body,
      };
    case "settlement_closed":
      return {
        titleKey: "SETTLEMENT_TOAST_CLOSED_TITLE",
        params: { result },
        body,
      };
    case "market_voided":
      return {
        titleKey: "SETTLEMENT_TOAST_VOIDED_TITLE",
        params: { points },
        body,
      };
    default:
      return null;
  }
}
