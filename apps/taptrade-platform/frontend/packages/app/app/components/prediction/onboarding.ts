/**
 * First-trade onboarding — pure helpers (no React).
 * Figma: "TapTrade Design" → 03 Screens → First-trade onboarding.
 *
 * Thesis: teach on the real surface, gate at commitment. Browsing stays
 * wall-free; the lesson is three coach beats anchored to the live ticket
 * of a REAL teaching market; signup interrupts nothing — the drafted
 * intent survives the auth redirect and restores afterwards.
 *
 * Deliberately NOT here (backend rules, tracked in the Figma rationale
 * card — never faked client-side): the 500-point welcome grant (wallet
 * rewards scaffolding) and the next-day settlement notification. Until
 * they land, a fresh account falls through to the ticket's existing
 * insufficient-points state and its Add-Points escape hatch.
 */

import type {
  OrderSide,
  PredictionMarket,
} from "@taptrade-ui/api-client/src/prediction-types";

/**
 * Titles that must never be a newcomer's first market. The imported
 * catalog carries junk listings (spam titles full of gambling language
 * and pipe-delimited SEO strings) — the points-only boundary applies
 * doubly to the teaching surface. This is a stopgap; the real fix is
 * catalog curation in the backoffice (tracked in the Figma rationale).
 */
const UNSUITABLE_TITLE = /betting|casino|bonus|promo|deposit|https?:|\|/i;

/**
 * Pick the teaching market: open, real liquidity, still tradeable, a
 * clean title, and as close to a coin-flip as the catalog offers —
 * 50/50 makes the price-is-probability lesson land without domain
 * knowledge. Ties break toward real activity (volume), then depth
 * (liquidity). Deterministic so the guided flow doesn't reshuffle
 * underfoot.
 */
export function pickTeachingMarket(
  markets: PredictionMarket[],
  nowMs: number,
): PredictionMarket | null {
  const candidates = markets.filter((market) => {
    if (market.status !== "open") return false;
    if ((market.liquidityPoints ?? 0) <= 0) return false;
    if (UNSUITABLE_TITLE.test(market.title)) return false;
    const close = Date.parse(market.closeAt);
    return Number.isFinite(close) && close > nowMs;
  });
  if (candidates.length === 0) return null;
  return candidates.reduce((best, market) => {
    const bestDist = Math.abs(50 - best.yesPricePoints);
    const dist = Math.abs(50 - market.yesPricePoints);
    if (dist !== bestDist) return dist < bestDist ? market : best;
    const volumeDelta =
      (market.volumePoints ?? 0) - (best.volumePoints ?? 0);
    if (volumeDelta !== 0) return volumeDelta > 0 ? market : best;
    return (market.liquidityPoints ?? 0) > (best.liquidityPoints ?? 0)
      ? market
      : best;
  });
}

export interface TradeDraft {
  marketId: string;
  side: OrderSide;
  savedAtMs: number;
}

const DRAFT_KEY = "taptrade.onboarding.draft";
const DISMISS_KEY = "taptrade.onboarding.dismissed";
/** Drafts older than a day restore nothing — prices have moved on. */
export const DRAFT_TTL_MS = 24 * 3_600_000;

/** Parse + validate a stored draft; expired or malformed → null. */
export function parseTradeDraft(
  raw: string | null,
  nowMs: number,
): TradeDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<TradeDraft>;
    if (
      typeof parsed.marketId !== "string" ||
      parsed.marketId.length === 0 ||
      (parsed.side !== "yes" && parsed.side !== "no") ||
      typeof parsed.savedAtMs !== "number" ||
      nowMs - parsed.savedAtMs > DRAFT_TTL_MS
    ) {
      return null;
    }
    return {
      marketId: parsed.marketId,
      side: parsed.side,
      savedAtMs: parsed.savedAtMs,
    };
  } catch {
    return null;
  }
}

/* localStorage wrappers — SSR-safe, quota/privacy-mode tolerant. */

export function readTradeDraft(nowMs: number): TradeDraft | null {
  if (typeof window === "undefined") return null;
  try {
    return parseTradeDraft(window.localStorage.getItem(DRAFT_KEY), nowMs);
  } catch {
    return null;
  }
}

export function saveTradeDraft(draft: TradeDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // storage unavailable (private mode/quota) — the flow degrades to
    // an unrestored signup, never an error
  }
}

export function clearTradeDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function isInviteDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInvite(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // ignore
  }
}

/** The three beats + the post-signup restored note, as i18n key pairs. */
export const COACH_BEATS = [
  { line: "ONBOARD_BEAT1", step: "ONBOARD_STEP1" },
  { line: "ONBOARD_BEAT2", step: "ONBOARD_STEP2" },
  { line: "ONBOARD_BEAT3", step: "ONBOARD_STEP3" },
] as const;
export const COACH_RESTORED = {
  line: "ONBOARD_RESTORED",
  step: "ONBOARD_RESTORED_STEP",
} as const;
