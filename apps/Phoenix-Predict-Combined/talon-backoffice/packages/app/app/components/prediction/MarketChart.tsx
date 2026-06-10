"use client";

/**
 * MarketChart — SVG line chart with glow + current-price marker.
 *
 * Renders inside a .glass card. Pulls volume-weighted YES price
 * buckets from /api/v1/markets/{id}/prices for the selected range,
 * with carry-forward applied to empty buckets server-side. The chart
 * is honest about missing data: loading shows a skeleton, a failed
 * fetch shows an unavailable panel with retry, and a market without
 * price movement draws a flat line at the real current price. Only
 * the demo flag (NEXT_PUBLIC_DEMO_SYNTHETIC_CHARTS) restores the old
 * synthetic-walk fallback for seeded demo boxes.
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import type { MarketPriceHistory } from "@phoenix-ui/api-client/src/prediction-types";
import { logger } from "../../lib/logger";
import { DEMO_SYNTHETIC_CHARTS } from "../../lib/features";
import {
  type ChartFetchStatus,
  format24hRange,
  resolveChartSeries,
} from "./market-chart-state";

type TimeRange = "1H" | "6H" | "1D" | "1W" | "ALL";

const api = createPredictionClient();

// Map the chart's UI range labels to the backend's /prices?range= values.
// 6H is the odd one out — the backend doesn't ship 6h buckets (the demo
// has too little volume to make them meaningful); map to 1d so the chart
// still loads and the granularity is the same hourly bucket size.
const RANGE_TO_API: Record<TimeRange, "1h" | "1d" | "1w" | "1m" | "all"> = {
  "1H": "1h",
  "6H": "1d",
  "1D": "1d",
  "1W": "1w",
  ALL: "all",
};

interface MarketChartProps {
  ticker: string;
  side?: "yes" | "no";
  yesPriceCents: number;
  noPriceCents?: number;
  previousPriceCents?: number;
  impliedProbability?: number;
  range24hLowCents?: number;
  range24hHighCents?: number;
  volume24hCents?: number;
  openInterestShares?: number;
}

const RANGES: TimeRange[] = ["1H", "6H", "1D", "1W", "ALL"];

const CHART_CARD_CLASS =
  "rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] px-7 py-6 font-['Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif]";
const CHART_HEAD_CLASS =
  "mb-[18px] flex flex-wrap items-end justify-between gap-4";
const CHART_PRICE_ROW_CLASS = "flex items-baseline gap-[14px]";
const CHART_PRICE_CLASS =
  "font-['Inter_Tight',_'Inter',_sans-serif] text-[56px] font-semibold leading-none tracking-[-0.04em] text-[var(--t1)] [font-variant-numeric:tabular-nums] max-[720px]:text-[40px]";
const CHART_SWITCHER_CLASS =
  "inline-flex gap-1 rounded-md border border-[var(--border-1)] bg-[var(--surface-2)] p-[3px]";
const CHART_BUTTON_BASE_CLASS =
  "min-w-11 cursor-pointer rounded-md border-0 px-[14px] py-1.5 font-['Inter',_sans-serif] text-xs font-semibold transition-colors duration-[120ms]";
const CHART_SVG_CLASS = "block h-[320px] w-full rounded-[var(--r-rh-sm)]";
const CHART_FOOT_CLASS =
  "mt-6 grid grid-cols-4 gap-6 border-t border-[var(--border-1)] pt-5 max-[720px]:grid-cols-2";
const CHART_STAT_LABEL_CLASS = "mb-1.5 text-xs font-medium text-[var(--t3)]";
const CHART_STAT_VALUE_CLASS =
  "font-['IBM_Plex_Mono',_monospace] text-lg font-semibold text-[var(--t1)] [font-variant-numeric:tabular-nums]";

function chartDeltaClass(down: boolean): string {
  return `rounded-[var(--r-pill)] px-2.5 py-1 font-['IBM_Plex_Mono',_monospace] text-[13px] font-semibold [font-variant-numeric:tabular-nums] ${
    down
      ? "bg-[var(--no-soft)] text-[var(--no-text)]"
      : "bg-[var(--yes-soft)] text-[var(--yes-text)]"
  }`;
}

function rangeButtonClass(active: boolean): string {
  return `${CHART_BUTTON_BASE_CLASS} ${
    active
      ? "bg-[var(--yes)] text-[#061a10]"
      : "bg-transparent text-[var(--t3)] hover:text-[var(--t1)]"
  }`;
}

function chartStatValueClass(side?: "yes" | "no"): string {
  const color =
    side === "yes"
      ? "text-[var(--yes-text)]"
      : side === "no"
        ? "text-[var(--no-text)]"
        : "text-[var(--t1)]";
  return `${CHART_STAT_VALUE_CLASS} ${color}`;
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
  side = "yes",
  yesPriceCents,
  noPriceCents,
  previousPriceCents,
  impliedProbability,
  range24hLowCents,
  range24hHighCents,
  volume24hCents,
  openInterestShares,
}: MarketChartProps) {
  const { t } = useTranslation("prediction");
  const [range, setRange] = useState<TimeRange>("1D");
  const [history, setHistory] = useState<MarketPriceHistory | null>(null);
  const [fetchStatus, setFetchStatus] = useState<ChartFetchStatus>("loading");
  const [retryNonce, setRetryNonce] = useState(0);
  const activePriceCents =
    side === "no" ? (noPriceCents ?? 100 - yesPriceCents) : yesPriceCents;
  const activePreviousPriceCents =
    typeof previousPriceCents === "number"
      ? side === "no"
        ? 100 - previousPriceCents
        : previousPriceCents
      : undefined;

  // Fetch real price history from /api/v1/markets/:ticker/prices?range=N
  // whenever the ticker or range changes (or the user hits Retry). The
  // fetch state resets to loading on every change so a failed range
  // doesn't poison the next one.
  useEffect(() => {
    let cancelled = false;
    setFetchStatus("loading");
    setHistory(null);
    api
      .getMarketPriceHistory(ticker, RANGE_TO_API[range])
      .then((h) => {
        if (cancelled) return;
        setHistory(h);
        setFetchStatus("success");
      })
      .catch((err: unknown) => {
        logger.warn("MarketChart", "price history fetch failed", err);
        if (cancelled) return;
        setHistory(null);
        setFetchStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [ticker, range, retryNonce]);

  const { state: chartState, values } = useMemo(() => {
    const realValues = history
      ? history.points.map((p) =>
          side === "no" ? 100 - p.yesPriceCents : p.yesPriceCents,
        )
      : null;
    return resolveChartSeries({
      fetchStatus,
      realValues,
      currentPriceCents: activePriceCents,
      syntheticSeed: `${ticker}-${side}`,
      range,
      syntheticFallbackEnabled: DEMO_SYNTHETIC_CHARTS,
    });
  }, [fetchStatus, history, ticker, side, range, activePriceCents]);
  const width = 800;
  const height = 320;
  const line = values.length >= 2 ? buildPath(values, width, height) : "";
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const markerY = height - (activePriceCents / 100) * height;

  const deltaCents =
    typeof activePreviousPriceCents === "number"
      ? activePriceCents - activePreviousPriceCents
      : 0;
  const deltaPct =
    typeof activePreviousPriceCents === "number" && activePreviousPriceCents > 0
      ? ((activePriceCents - activePreviousPriceCents) /
          activePreviousPriceCents) *
        100
      : 0;
  const deltaStr = `${deltaCents >= 0 ? "+" : ""}${deltaCents}¢ · ${deltaCents >= 0 ? "+" : ""}${deltaPct.toFixed(1)}% 24h`;
  // Keep the chart series tied to the selected contract side so NO matches
  // the NO button even when the NO price is moving up.
  const lineColor = side === "no" ? "var(--no-text)" : "var(--yes-text)";

  const prob =
    typeof impliedProbability === "number"
      ? side === "no"
        ? 100 - impliedProbability
        : impliedProbability
      : activePriceCents;
  // Missing range bounds render as a dash — inventing plausible numbers
  // here misleads traders. 0 volume / 0 open interest are real values.
  const range24h = format24hRange(range24hLowCents, range24hHighCents);
  const vol24h = typeof volume24hCents === "number" ? volume24hCents : 0;
  const oi = typeof openInterestShares === "number" ? openInterestShares : 0;

  return (
    <section className={CHART_CARD_CLASS}>
      <div className={CHART_HEAD_CLASS}>
        <div className={CHART_PRICE_ROW_CLASS}>
          <div className={CHART_PRICE_CLASS}>{activePriceCents}¢</div>
          {typeof previousPriceCents === "number" && (
            <div className={chartDeltaClass(deltaCents < 0)}>{deltaStr}</div>
          )}
        </div>
        <div
          className={CHART_SWITCHER_CLASS}
          role="tablist"
          aria-label={t("TIME_RANGE")}
        >
          {RANGES.map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={r === range}
              className={rangeButtonClass(r === range)}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {chartState === "loading" && (
        <div
          className="h-[320px] w-full animate-pulse rounded-[var(--r-rh-sm)] bg-[var(--surface-2)]"
          role="status"
          aria-label={t("CHART_LOADING")}
        />
      )}

      {chartState === "error" && (
        <div className="flex h-[320px] w-full flex-col items-center justify-center gap-3 rounded-[var(--r-rh-sm)] border border-[var(--border-1)] bg-[var(--surface-2)]">
          <div className="text-sm font-medium text-[var(--t3)]">
            {t("PRICE_HISTORY_UNAVAILABLE")}
          </div>
          <button
            className="cursor-pointer rounded-md border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-1.5 font-['Inter',_sans-serif] text-xs font-semibold text-[var(--t1)] transition-colors duration-[120ms] hover:border-[var(--border-2)]"
            onClick={() => setRetryNonce((n) => n + 1)}
          >
            {t("RETRY")}
          </button>
        </div>
      )}

      {(chartState === "ready" || chartState === "empty") && (
        <svg
          className={CHART_SVG_CLASS}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-label={t(side === "no" ? "NO_PRICE_CHART" : "YES_PRICE_CHART", {
            ticker,
          })}
        >
          <defs>
            <linearGradient
              id={`mc-fill-${ticker}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.32" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          <g stroke="rgba(26,26,26,0.07)" strokeWidth="1">
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
            <circle r="3" fill="#ffffff" />
          </g>

          {chartState === "empty" && (
            <text
              x={width / 2}
              y={height / 2 - 14}
              textAnchor="middle"
              fontFamily="Inter, sans-serif"
              fontSize="14"
              fill="var(--t3)"
            >
              {t("NO_TRADES_IN_RANGE")}
            </text>
          )}
        </svg>
      )}

      <div className={CHART_FOOT_CLASS}>
        <div>
          <div className={CHART_STAT_LABEL_CLASS}>
            {t("IMPLIED_PROBABILITY")}
          </div>
          <div className={chartStatValueClass(side)}>{prob.toFixed(1)}%</div>
        </div>
        <div>
          <div className={CHART_STAT_LABEL_CLASS}>{t("24H_RANGE")}</div>
          <div className={chartStatValueClass()}>{range24h ?? "—"}</div>
        </div>
        <div>
          <div className={CHART_STAT_LABEL_CLASS}>{t("24H_VOLUME")}</div>
          <div className={chartStatValueClass()}>
            ${(vol24h / 100).toFixed(2)}
          </div>
        </div>
        <div>
          <div className={CHART_STAT_LABEL_CLASS}>{t("OPEN_INTEREST")}</div>
          <div className={chartStatValueClass()}>
            {t("SHARES_COUNT", { quantity: oi.toLocaleString() })}
          </div>
        </div>
      </div>
    </section>
  );
}
