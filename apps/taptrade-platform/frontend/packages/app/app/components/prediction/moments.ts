/**
 * Moments IA — pure derivations (no React, no fetch).
 *
 * The domain hierarchy is categories → series → events → markets, and every
 * market carries an eventId — the discovery surface just never used it.
 * "Moments" is that layer surfaced: events become the unit of discovery
 * (DESIGN.md; Figma "TapTrade Design" → 03 Screens → Feed v2 · Moments IA).
 *
 * Honesty rules (the Five Rules applied to time):
 *  - countdowns are computed from the real closeAt, never styled as alarm
 *  - a moment card states only provable facts (category, close window,
 *    market count, a real market's real price)
 *  - no fabricated "trending"/"hot" — activity claims need volume data
 *
 * GET /api/v1/events 500s in dev (2026-08-07), so cluster labels derive
 * client-side from the member markets (majority category + close window)
 * until the backend exposes editorial event titles.
 */

import type { PredictionMarket } from "@taptrade-ui/api-client/src/prediction-types";

export interface EventCluster {
  eventId: string;
  markets: PredictionMarket[];
  /** Majority category display name among members (ties → first seen). */
  categoryName: string;
  /** Earliest member closeAt, as epoch ms (NaN when none parse). */
  firstCloseMs: number;
}

export type FeedGroup =
  | { kind: "cluster"; cluster: EventCluster }
  | { kind: "single"; market: PredictionMarket };

const closeMs = (market: PredictionMarket): number =>
  Date.parse(market.closeAt);

function majorityCategoryName(markets: PredictionMarket[]): string {
  const counts = new Map<string, number>();
  for (const m of markets) {
    const name = m.categoryName || m.categorySlug || "";
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

function toCluster(eventId: string, markets: PredictionMarket[]): EventCluster {
  const times = markets.map(closeMs).filter((t) => Number.isFinite(t));
  return {
    eventId,
    markets,
    categoryName: majorityCategoryName(markets),
    firstCloseMs: times.length ? Math.min(...times) : Number.NaN,
  };
}

/**
 * Group a feed list by eventId preserving first-appearance order.
 * Events with 2+ members become clusters; the rest stay flat singles.
 */
export function groupFeedByEvent(markets: PredictionMarket[]): FeedGroup[] {
  const byEvent = new Map<string, PredictionMarket[]>();
  const order: string[] = [];
  for (const market of markets) {
    const key = market.eventId || market.id;
    if (!byEvent.has(key)) {
      byEvent.set(key, []);
      order.push(key);
    }
    byEvent.get(key)?.push(market);
  }
  return order.map((key) => {
    const members = byEvent.get(key) ?? [];
    return members.length >= 2
      ? { kind: "cluster", cluster: toCluster(key, members) }
      : { kind: "single", market: members[0] };
  });
}

/**
 * Open markets closing within `windowMs` of `nowMs`, soonest first.
 * The deadline IS the moment — this feeds the "settles within 24h" lane.
 */
export function settlingSoon(
  markets: PredictionMarket[],
  nowMs: number,
  windowMs: number,
  limit: number,
): PredictionMarket[] {
  return markets
    .filter((market) => {
      if (market.status !== "open") return false;
      const t = closeMs(market);
      return Number.isFinite(t) && t > nowMs && t - nowMs <= windowMs;
    })
    .sort((a, b) => closeMs(a) - closeMs(b))
    .slice(0, Math.max(0, limit));
}

export interface Moment {
  eventId: string;
  categoryName: string;
  firstCloseMs: number;
  marketCount: number;
  /** The group's loudest member: highest volume, ties → earliest close. */
  headline: PredictionMarket;
  /** Second-loudest member — clusters always have one (2+ by definition). */
  secondary: PredictionMarket;
}

/**
 * Derive moment cards for the HAPPENING NOW strip: multi-market events
 * ranked by earliest close (the most imminent moment first).
 */
export function deriveMoments(
  markets: PredictionMarket[],
  limit: number,
): Moment[] {
  return groupFeedByEvent(markets)
    .filter(
      (group): group is Extract<FeedGroup, { kind: "cluster" }> =>
        group.kind === "cluster",
    )
    .map(({ cluster }) => {
      const [headline, secondary] = [...cluster.markets].sort(
        (a, b) =>
          (b.volumePoints ?? 0) - (a.volumePoints ?? 0) ||
          closeMs(a) - closeMs(b),
      );
      return {
        eventId: cluster.eventId,
        categoryName: cluster.categoryName,
        firstCloseMs: cluster.firstCloseMs,
        marketCount: cluster.markets.length,
        headline,
        secondary,
      };
    })
    .sort((a, b) => {
      const at = Number.isFinite(a.firstCloseMs) ? a.firstCloseMs : Infinity;
      const bt = Number.isFinite(b.firstCloseMs) ? b.firstCloseMs : Infinity;
      return at - bt;
    })
    .slice(0, Math.max(0, limit));
}

/**
 * Compact, locale-neutral countdown: "18h", "43m", "3d". Hour granularity
 * above 60 minutes, day granularity above 48 hours — a discovery surface
 * needs the scale, not the seconds. Returns null at/after the deadline
 * (callers state the closed fact instead of a fake countdown).
 */
export function formatCompactCountdown(deltaMs: number): string | null {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return null;
  const totalMin = Math.floor(deltaMs / 60_000);
  if (totalMin < 1) return "<1m";
  if (totalMin < 60) return `${totalMin}m`;
  const totalHours = Math.floor(totalMin / 60);
  if (totalHours < 48) return `${totalHours}h`;
  return `${Math.floor(totalHours / 24)}d`;
}
