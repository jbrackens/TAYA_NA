"use client";

/**
 * MarketChart — SVG line chart with glow + current-price marker.
 *
 * Renders inside a .glass card. Real historical data isn't wired yet,
 * so the line is a deterministic walk derived from the market ticker
 * (matches the prior MarketCard approach) that nudges toward
 * currentYesPrice at the right edge. When the backend exposes a
 * /market/:id/prices?range=… endpoint, swap `samplePath` for the fetched
 * series.
 */

import { useMemo, useState } from "react";

type TimeRange = "1H" | "6H" | "1D" | "1W" | "ALL";

interface MarketChartProps {
  ticker: string;
  yesPriceCents: number;
  previousPriceCents?: number;
  impliedProbability?: number;
  range24hLowCents?: number;
  range24hHighCents?: number;
  volume24hCents?: number;
  openInterestShares?: number;
}

const RANGES: TimeRange[] = ["1H", "6H", "1D", "1W", "ALL"];

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function hashTicker(ticker: string): number {
  let h = 0;
  for (const c of ticker) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return h || 42;
}

function samplePath(
  ticker: string,
  range: TimeRange,
  targetCents: number,
): number[] {
  const rand = seededRandom(hashTicker(ticker) ^ range.charCodeAt(0));
  const n = 41;
  const points: number[] = [];
  let v = targetCents + (rand() - 0.5) * 14;
  for (let i = 0; i < n - 1; i++) {
    v += (rand() - 0.5) * 6;
    v = Math.max(8, Math.min(92, v));
    points.push(v);
  }
  points.push(targetCents);
  return points;
}

function buildPath(values: number[], width: number, height: number): string {
  const stepX = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - (v / 100) * height;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function MarketChart({
  ticker,
  yesPriceCents,
  previousPriceCents,
  impliedProbability,
  range24hLowCents,
  range24hHighCents,
  volume24hCents,
  openInterestShares,
}: MarketChartProps) {
  const [range, setRange] = useState<TimeRange>("1D");

  const values = useMemo(
    () => samplePath(ticker, range, yesPriceCents),
    [ticker, range, yesPriceCents],
  );
  const width = 800;
  const height = 320;
  const line = buildPath(values, width, height);
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const markerY = height - (yesPriceCents / 100) * height;

  const deltaCents =
    typeof previousPriceCents === "number"
      ? yesPriceCents - previousPriceCents
      : 0;
  const deltaPct =
    typeof previousPriceCents === "number" && previousPriceCents > 0
      ? ((yesPriceCents - previousPriceCents) / previousPriceCents) * 100
      : 0;
  const deltaStr = `${deltaCents >= 0 ? "+" : ""}${deltaCents}¢ · ${deltaCents >= 0 ? "+" : ""}${deltaPct.toFixed(1)}% 24h`;
  const isUp = deltaCents >= 0;
  /* P8: line stroke uses --yes-text/#1A6849 (6.7:1 on white) not --yes
   * (#71eeb8, 1.9:1) which fails AA on light surfaces. Gradient fill
   * stays soft seafoam/coral (decorative, not text). */
  const lineColor = isUp ? "var(--yes-text)" : "var(--no-text)";

  const prob =
    typeof impliedProbability === "number" ? impliedProbability : yesPriceCents;
  const rangeLow =
    typeof range24hLowCents === "number"
      ? range24hLowCents
      : Math.max(0, yesPriceCents - 4);
  const rangeHigh =
    typeof range24hHighCents === "number"
      ? range24hHighCents
      : Math.min(100, yesPriceCents + 2);
  const vol24h = typeof volume24hCents === "number" ? volume24hCents : 0;
  const oi = typeof openInterestShares === "number" ? openInterestShares : 0;

  return (
    <>
      <style>{`
        .mc-card {
          background: var(--surface-1);
          border: 1px solid var(--border-1);
          padding: 24px 28px;
          border-radius: var(--r-rh-lg);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .mc-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 18px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .mc-price-row { display: flex; align-items: baseline; gap: 14px; }
        .mc-price {
          font-family: 'Inter Tight', 'Inter', sans-serif;
          font-size: 56px;
          font-weight: 600;
          color: var(--t1);
          line-height: 1;
          letter-spacing: -0.04em;
          font-variant-numeric: tabular-nums;
        }
        .mc-delta {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          font-weight: 600;
          color: var(--yes-text);
          padding: 4px 10px;
          border-radius: var(--r-pill);
          background: var(--yes-soft);
          font-variant-numeric: tabular-nums;
        }
        .mc-delta.down {
          color: var(--no-text);
          background: var(--no-soft);
        }
        .mc-switcher {
          display: inline-flex;
          gap: 4px;
          padding: 3px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-1);
          border-radius: var(--r-pill);
        }
        .mc-switcher button {
          background: transparent;
          border: none;
          color: var(--t3);
          padding: 6px 14px;
          min-width: 44px;
          border-radius: var(--r-pill);
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: color 120ms ease, background 120ms ease;
        }
        .mc-switcher button:hover { color: var(--t1); }
        .mc-switcher button.is-active {
          color: #061a10;
          background: var(--accent);
        }
        .mc-svg {
          width: 100%;
          height: 320px;
          display: block;
          border-radius: var(--r-rh-sm);
        }
        .mc-foot {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--border-1);
        }
        .mc-stat .l {
          font-size: 12px;
          color: var(--t3);
          margin-bottom: 6px;
          font-weight: 500;
        }
        .mc-stat .v {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 18px;
          font-weight: 600;
          color: var(--t1);
          font-variant-numeric: tabular-nums;
        }
        .mc-stat .v.yes { color: var(--yes-text); }
        .mc-stat .v.no  { color: var(--no-text); }
        @media (max-width: 720px) {
          .mc-price { font-size: 40px; }
          .mc-foot { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
      <section className="mc-card">
        <div className="mc-head">
          <div className="mc-price-row">
            <div className="mc-price">{yesPriceCents}¢</div>
            {typeof previousPriceCents === "number" && (
              <div className={`mc-delta ${deltaCents < 0 ? "down" : ""}`}>
                {deltaStr}
              </div>
            )}
          </div>
          <div className="mc-switcher" role="tablist" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                key={r}
                role="tab"
                aria-selected={r === range}
                className={r === range ? "is-active" : ""}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <svg
          className="mc-svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-label={`YES price chart for ${ticker}`}
        >
          <defs>
            <linearGradient
              id={`mc-fill-${ticker}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={isUp ? "#71eeb8" : "#ff8b6b"} stopOpacity="0.18" />
              <stop offset="100%" stopColor={isUp ? "#71eeb8" : "#ff8b6b"} stopOpacity="0" />
            </linearGradient>
          </defs>

          <g stroke="rgba(26,26,26,0.06)" strokeWidth="1">
            <line x1="0" x2={width} y1={height * 0.2} y2={height * 0.2} />
            <line x1="0" x2={width} y1={height * 0.4} y2={height * 0.4} />
            <line x1="0" x2={width} y1={height * 0.6} y2={height * 0.6} />
            <line x1="0" x2={width} y1={height * 0.8} y2={height * 0.8} />
          </g>
          <g
            fontFamily="IBM Plex Mono"
            fontSize="10"
            fill="#8B8378"
          >
            <text x="8" y="20">
              100¢
            </text>
            <text x="8" y={height * 0.2 + 4}>
              75¢
            </text>
            <text x="8" y={height * 0.4 + 4}>
              50¢
            </text>
            <text x="8" y={height * 0.6 + 4}>
              25¢
            </text>
            <text x="8" y={height - 8}>
              0¢
            </text>
          </g>

          <path d={area} fill={`url(#mc-fill-${ticker})`} />
          <path
            d={line}
            stroke={lineColor}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <line
            x1="0"
            x2={width}
            y1={markerY}
            y2={markerY}
            stroke={lineColor}
            strokeOpacity="0.3"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <g transform={`translate(${width},${markerY})`}>
            <circle r="5" fill={lineColor} />
            <circle r="3" fill="var(--surface-1)" />
          </g>
        </svg>

        <div className="mc-foot">
          <div className="mc-stat">
            <div className="l">Implied probability</div>
            <div className="v yes">{prob.toFixed(1)}%</div>
          </div>
          <div className="mc-stat">
            <div className="l">24h range</div>
            <div className="v">
              {rangeLow}¢ – {rangeHigh}¢
            </div>
          </div>
          <div className="mc-stat">
            <div className="l">24h volume</div>
            <div className="v">${(vol24h / 100).toFixed(2)}</div>
          </div>
          <div className="mc-stat">
            <div className="l">Open interest</div>
            <div className="v">{oi.toLocaleString()} shares</div>
          </div>
        </div>
      </section>
    </>
  );
}
