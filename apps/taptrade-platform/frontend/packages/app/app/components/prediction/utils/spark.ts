/**
 * Shared price-history SVG helpers for the discovery surfaces
 * (DiscoveryHero, TrendingSidebar, market cards).
 *
 * P10 honesty contract (2026-07-12): these helpers draw ONLY real,
 * caller-supplied price series. The former `deterministicDelta` (a
 * ticker-hash fake "today" delta) and the synthetic random-walk
 * fallbacks are deleted — fabricated movement must never render as
 * market signal. The one sanctioned synthetic path in the app is
 * `samplePath` in market-chart-state.ts, which is gated behind
 * NEXT_PUBLIC_DEMO_SYNTHETIC_CHARTS and must be visibly labeled
 * "Simulated" wherever it renders (see MarketChart / DiscoveryHero).
 *
 * Callers derive deltas from the same series they chart, via
 * `seriesDelta` below — one source of truth for line and number.
 */

/**
 * Real delta from a price series: change from the first to the last
 * sample. Returns null when the series can't support an honest claim
 * (fewer than 2 points).
 */
export function seriesDelta(
  points: number[] | null | undefined,
): { delta: number; pct: number; up: boolean; flat: boolean } | null {
  if (!points || points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const delta = last - first;
  const pct = first > 0 ? (delta / first) * 100 : 0;
  return { delta, pct, up: delta >= 0, flat: delta === 0 };
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
 * coordinate (for the live dot) from a REAL price series. Returns null
 * when the series has fewer than 2 points — callers render an honest
 * loading / empty state instead of a curve.
 *
 * P9: the y-domain auto-scales to the series range (with a 6¢ minimum
 * span so quiet markets still show topology) instead of the absolute
 * 0–100 band. `baselineY` is the session open (first sample) for the
 * dashed reference line.
 */
export function heroChartPath(
  points: number[] | null | undefined,
  width = 800,
  height = 220,
): {
  line: string;
  fill: string;
  end: { x: number; y: number };
  baselineY: number;
} | null {
  if (!points || points.length < 2) return null;
  const values = points;
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

/**
 * Compact sparkline path from a REAL price series (Top Movers rows).
 * Downsamples to at most `maxSamples` evenly-spaced points so a dense
 * 1-day series still reads at 60×28. Returns null when the series
 * can't support a curve.
 */
export function sparklinePathFromSeries(
  points: number[] | null | undefined,
  width = 60,
  height = 28,
  maxSamples = 16,
): string | null {
  if (!points || points.length < 2) return null;
  let series = points;
  if (series.length > maxSamples) {
    const step = (series.length - 1) / (maxSamples - 1);
    series = Array.from(
      { length: maxSamples },
      (_, i) => points[Math.round(i * step)],
    );
  }
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const span = Math.max(hi - lo, 2); // min 2¢ span so flat-ish reads flat, not noisy
  const pad = height * 0.1;
  return smoothPath(
    series.map((v, i) => [
      (i / (series.length - 1)) * width,
      pad + (1 - (v - lo) / span) * (height - pad * 2),
    ]),
  );
}
