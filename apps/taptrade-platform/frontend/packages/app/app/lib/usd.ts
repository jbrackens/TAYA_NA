/**
 * usd.ts — the single USD price formatter for real-money purchase prices.
 *
 * Point pack prices ride the wire as integer USD cents (priceUsdCents,
 * STORE_AND_PAYMENTS.md §1) and are formatted HERE, in code, client-side.
 * Currency strings never enter locale bundles — the 6-language locale
 * scanner bans "$"/money wording there — and no other module may roll its
 * own price formatter (pinned by app/__tests__/store-source-boundaries).
 *
 * This module formats real purchase prices ONLY. Point balances and point
 * amounts always go through app/lib/points — never through here.
 */

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** 500 → "$5.00", 10000 → "$100.00". Non-finite input renders as "$0.00". */
export function formatUsdCents(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0;
  return USD_FORMATTER.format(safe / 100);
}
