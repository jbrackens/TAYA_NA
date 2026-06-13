/**
 * Shared currency / number formatting (P2-08 consolidation).
 *
 * One `formatCents` to replace the per-component hand-rolled Intl variants.
 * Input is integer cents (the storage + API unit). Options preserve each call
 * site's prior behavior so consolidation is output-neutral:
 *   - minimumFractionDigits (default 2; some surfaces drop a whole-dollar's
 *     trailing ".00" by passing 0)
 *   - currency (default "USD")
 *
 * Remaining P2-08 formatter work (later increments): the compact "$1.2K/$3.4M"
 * abbreviation (formatCompactUsd in prediction/market-display.ts) is a distinct
 * helper; the dollars-input formatCurrency in CurrentBalance /
 * DepositThresholdModal takes already-converted dollars; and several inline
 * `${(cents/100).toFixed(2)}` sites use no thousands separator — folding those
 * in changes rendered output, so each is migrated deliberately, not blindly.
 */

export interface FormatCentsOptions {
  minimumFractionDigits?: number;
  currency?: string;
}

export function formatCents(
  cents: number,
  opts: FormatCentsOptions = {},
): string {
  const { minimumFractionDigits = 2, currency = "USD" } = opts;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits,
  }).format(cents / 100);
}
