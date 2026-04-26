/**
 * Shared deterministic price-history helpers for the Robinhood-direction
 * components (DiscoveryHero, TrendingSidebar/TopMovers, MarketCard).
 *
 * Real backend price history is not yet wired (no GET /markets/:id/prices
 * endpoint). Each helper is seeded by the ticker so the same market
 * always renders the same fake history across surfaces — Top Movers row
 * and homepage Hero stay visually consistent for the same ticker.
 *
 * Replace these with backend-fetched series when the prices endpoint
 * ships (see DESIGN.md §11 Decisions Log).
 */

export function tickerSeed(ticker: string): number {
  let s = 0;
  for (let i = 0; i < ticker.length; i++) {
    s = ((s << 5) - s + ticker.charCodeAt(i)) | 0;
  }
  return Math.abs(s);
}

/** ±5¢ change biased slightly positive. Returns absolute delta and percentage. */
export function deterministicDelta(
  ticker: string,
  currentCents: number,
): { delta: number; pct: number; up: boolean } {
  const seed = tickerSeed(ticker);
  const delta = (seed % 11) - 4;
  const prev = Math.max(1, Math.min(99, currentCents - delta));
  const pct = ((currentCents - prev) / prev) * 100;
  return { delta, pct, up: delta >= 0 };
}

/** N points of plausible price walk ending at currentCents. */
function walk(
  ticker: string,
  currentCents: number,
  N: number,
  opts?: { biasUp?: boolean },
): Array<[number, number]> {
  let s = tickerSeed(ticker) || 1;
  const points: Array<[number, number]> = [];
  let val = opts?.biasUp == null ? 50 : opts.biasUp ? 25 : 75;
  const trendBias = opts?.biasUp == null ? 0 : opts.biasUp ? -1 : 1;
  for (let i = 0; i < N; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const noise = ((s % 1000) - 500) / 70;
    val = Math.max(8, Math.min(92, val + noise + trendBias));
    points.push([i, val]);
  }
  // Pin the endpoint to the current price.
  points[N - 1][1] = currentCents;
  return points;
}

/** Hero chart: 24-point walk, returns an SVG line path and a fill path. */
export function heroChartPath(
  ticker: string,
  currentCents: number,
  width = 800,
  height = 220,
): { line: string; fill: string } {
  const N = 24;
  const pts = walk(ticker, currentCents, N);
  const line = pts
    .map(([i, v], idx) => {
      const x = (i / (N - 1)) * width;
      const y = height - (v / 100) * height;
      return `${idx === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const fill = line + ` L${width},${height} L0,${height} Z`;
  return { line, fill };
}

/** Compact sparkline path used by Top Movers rows + MarketCard footers. */
export function sparklinePath(
  ticker: string,
  currentCents: number,
  up: boolean,
  width = 60,
  height = 28,
): string {
  const N = 8;
  const pts = walk(ticker + (up ? "↑" : "↓"), currentCents, N, {
    biasUp: up,
  });
  return pts
    .map(([i, v], idx) => {
      const x = (i / (N - 1)) * width;
      const y = height - (v / 100) * height;
      return `${idx === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
