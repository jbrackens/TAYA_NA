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
        .mc-card { padding: 22px 24px 18px; border-radius: var(--r-md); }
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
          font-family: 'IBM Plex Mono', monospace;
          font-size: 48px;
          font-weight: 600;
          color: var(--yes);
          line-height: 1;
          letter-spacing: -0.02em;
          font-variant-numeric: tabular-nums;
          text-shadow: 0 0 24px var(--yes-glow);
        }
        .mc-delta {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 14px;
          font-weight: 600;
          color: var(--accent);
          padding: 4px 10px;
          border-radius: var(--r-pill);
          background: rgba(43, 228, 128, 0.08);
          border: 1px solid rgba(43, 228, 128, 0.2);
          font-variant-numeric: tabular-nums;
          text-shadow: 0 0 8px var(--accent-glow-color);
        }
        .mc-delta.down {
          color: var(--no);
          background: var(--no-soft);
          border-color: var(--no-border);
          text-shadow: 0 0 8px var(--no-glow);
        }
        .mc-switcher {
          display: flex;
          gap: 2px;
          padding: 3px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--r-pill);
          box-shadow:
            inset 0 1px 2px rgba(0, 0, 0, 0.3),
            inset 0 -1px 0 rgba(255, 255, 255, 0.04);
        }
        .mc-switcher button {
          background: transparent;
          border: none;
          color: var(--t3);
          padding: 6px 12px;
          border-radius: var(--r-pill);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 150ms ease;
        }
        .mc-switcher button:hover { color: var(--t1); }
        .mc-switcher button.is-active {
          color: var(--t1);
          background: rgba(255, 255, 255, 0.08);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.15),
            0 1px 3px rgba(0, 0, 0, 0.3);
        }
        .mc-svg {
          width: 100%;
          height: 320px;
          display: block;
          border-radius: var(--r-sm);
        }
        .mc-foot {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .mc-stat .l {
          font-size: 10px;
          color: var(--t3);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-bottom: 4px;
          font-weight: 600;
        }
        .mc-stat .v {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 16px;
          font-weight: 600;
          color: var(--t1);
          font-variant-numeric: tabular-nums;
        }
        .mc-stat .v.accent { color: var(--accent); text-shadow: 0 0 8px var(--accent-glow-color); }
        .mc-stat .v.yes { color: var(--yes); text-shadow: 0 0 8px var(--yes-glow); }
        @media (max-width: 720px) {
          .mc-price { font-size: 36px; }
          .mc-foot { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
      <section className="glass mc-card">
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
              <stop offset="0%" stopColor="var(--yes)" stopOpacity="0.38" />
              <stop offset="100%" stopColor="var(--yes)" stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id={`mc-line-${ticker}`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="var(--yes)" stopOpacity="0.7" />
              <stop offset="100%" stopColor="var(--yes)" stopOpacity="1" />
            </linearGradient>
            <filter
              id={`mc-glow-${ticker}`}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>
          </defs>

          <g stroke="rgba(255,255,255,0.04)" strokeWidth="1">
            <line x1="0" x2={width} y1={height * 0.2} y2={height * 0.2} />
            <line x1="0" x2={width} y1={height * 0.4} y2={height * 0.4} />
            <line x1="0" x2={width} y1={height * 0.6} y2={height * 0.6} />
            <line x1="0" x2={width} y1={height * 0.8} y2={height * 0.8} />
          </g>
          <g
            fontFamily="IBM Plex Mono"
            fontSize="10"
            fill="rgba(255,255,255,0.28)"
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
            stroke={`url(#mc-line-${ticker})`}
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#mc-glow-${ticker})`}
          />
          <path
            d={line}
            stroke="var(--yes-hi)"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <line
            x1="0"
            x2={width}
            y1={markerY}
            y2={markerY}
            stroke="var(--yes-glow)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <g transform={`translate(${width},${markerY})`}>
            <circle r="6" fill="var(--yes-hi)" opacity="0.3" />
            <circle r="3" fill="#ffffff" />
            <circle
              r="3"
              fill="none"
              stroke="var(--yes-hi)"
              strokeWidth="1.5"
            />
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
            <div className="v accent">{oi.toLocaleString()} shares</div>
          </div>
        </div>
      </section>
    </>
  );
}
