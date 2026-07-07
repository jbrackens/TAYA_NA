/**
 * Shared price-history helpers for the Robinhood-direction components
 * (DiscoveryHero, TrendingSidebar/TopMovers, MarketCard).
 *
 * heroChartPath now accepts an optional `points` array — when the
 * caller has fetched real history from GET /markets/:id/prices, it
 * builds the SVG from that. Without points it falls back to the
 * deterministic walk so the chart still renders during the fetch
 * window or in test mode. sparklinePath remains synthetic-only:
 * sparklines are 60×28 px decorative thumbs and the per-sparkline
 * fetch cost on a page with 30+ market cards isn't worth the visual
 * improvement.
 *
 * useHeroPriceHistory (in this file) is the small hook hero consumers
 * call to fetch the real series. Returns null while loading or on
 * failure; pass through to heroChartPath which gracefully falls back.
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

/**
 * Catmull-Rom → cubic-bézier smoothing. Polyline charts read as
 * synthetic; a smoothed monotone-ish curve through the same points is
 * the single biggest perceived-quality lever on the hero chart.
 */
function smoothPath(coords: Array<[number, number]>): string {
  if (coords.length < 3) {
    return coords
      .map(
        ([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`,
      )
      .join(" ");
  }
  const d = [`M${coords[0][0].toFixed(1)},${coords[0][1].toFixed(1)}`];
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(coords.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(
      `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`,
    );
  }
  return d.join(" ");
}

/**
 * Hero chart: builds the SVG line + fill paths plus the endpoint
 * coordinate (for the live dot). When `points` is supplied (from the
 * backend prices endpoint), the chart uses the real volume-weighted
 * history. Otherwise it falls back to a 24-point deterministic walk
 * anchored at currentCents so the SVG still renders during the fetch
 * or if the API fails.
 *
 * P9: the y-domain auto-scales to the series range (with a 6¢ minimum
 * span so quiet markets still show topology) instead of the absolute
 * 0–100 band. An absolute domain rendered a 60–64¢ market as a flat
 * stroke over a plot that was ~90% dead space — the single biggest
 * "awkward layout" tell on the old hero. `baselineY` is the session
 * open (first sample) for the dashed reference line.
 */
export function heroChartPath(
  ticker: string,
  currentCents: number,
  width = 800,
  height = 220,
  points?: number[],
): {
  line: string;
  fill: string;
  end: { x: number; y: number };
  baselineY: number;
} {
  let values: number[];
  if (points && points.length >= 2 && points.some((p) => p !== points[0])) {
    values = points;
  } else {
    const pts = walk(ticker, currentCents, 24);
    values = pts.map(([, v]) => v);
  }
  const N = values.length;
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const MIN_SPAN = 6;
  if (hi - lo < MIN_SPAN) {
    const mid = (hi + lo) / 2;
    lo = Math.max(0, mid - MIN_SPAN / 2);
    hi = Math.min(100, mid + MIN_SPAN / 2);
  }
  const margin = (hi - lo) * 0.18;
  lo = Math.max(0, lo - margin);
  hi = Math.min(100, hi + margin);
  const pad = height * 0.06;
  const yFor = (v: number) =>
    pad + (1 - (v - lo) / (hi - lo)) * (height - pad * 2);
  const coords: Array<[number, number]> = values.map((v, idx) => [
    (idx / (N - 1)) * width,
    yFor(v),
  ]);
  const line = smoothPath(coords);
  const fill = line + ` L${width},${height} L0,${height} Z`;
  const [ex, ey] = coords[N - 1];
  return { line, fill, end: { x: ex, y: ey }, baselineY: yFor(values[0]) };
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
  const pad = height * 0.1;
  return smoothPath(
    pts.map(([i, v]) => [
      (i / (N - 1)) * width,
      pad + (1 - v / 100) * (height - pad * 2),
    ]),
  );
}
