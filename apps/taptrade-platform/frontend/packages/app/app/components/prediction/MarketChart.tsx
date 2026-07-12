"use client";

/**
 * MarketChart — the market page price chart
 * (P9.2, 2026-07-07 — Robinhood-structure pass).
 *
 * Draws BOTH sides of the binary from one history: the selected side's
 * line at full strength, its complement (100 − price) muted underneath —
 * the two lines mirror around 50¢ and cross exactly like the two-outcome
 * charts on Robinhood/Kalshi event pages. No gradient wash, no gridlines,
 * no in-chart price header (MarketHead owns the numbers now); a quiet
 * mono text-tab range switcher sits under the plot.
 *
 * Pulls volume-weighted YES price buckets from
 * /api/v1/markets/{id}/prices for the selected range, with carry-forward
 * applied to empty buckets server-side. The chart is honest about missing
 * data: loading shows a skeleton, a failed fetch shows an unavailable
 * panel with retry, and a market without price movement draws a flat line
 * at the real current price. Only the demo flag
 * (NEXT_PUBLIC_DEMO_SYNTHETIC_CHARTS) restores the synthetic-walk
 * fallback for seeded demo boxes.
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import type { MarketPriceHistory } from "@taptrade-ui/api-client/src/prediction-types";
import { logger } from "../../lib/logger";
import { DEMO_SYNTHETIC_CHARTS } from "../../lib/features";
import {
  type ChartFetchStatus,
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
  yesPricePoints: number;
  noPricePoints?: number;
}

const RANGES: TimeRange[] = ["1H", "6H", "1D", "1W", "ALL"];

const CHART_CARD_CLASS =
  "font-['Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif]";
const CHART_SVG_CLASS = "block h-[300px] w-full";
// P9.2: the range switcher is a quiet mono text-tab row under the plot
// (Robinhood-style), not a segmented fill control. Active = ink text +
// 2px ink underline; inactive = --t3.
const CHART_SWITCHER_CLASS = "mt-4 flex items-center gap-5";
const CHART_BUTTON_BASE_CLASS =
  "cursor-pointer border-0 bg-transparent p-0 pb-1 font-['IBM_Plex_Mono',_monospace] text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-[120ms] border-b-2";

function rangeButtonClass(active: boolean): string {
  return `${CHART_BUTTON_BASE_CLASS} ${
    active
      ? "text-[var(--t1)] border-[var(--t1)]"
      : "text-[var(--t3)] border-transparent hover:text-[var(--t1)]"
  }`;
}

function buildPath(values: number[], width: number, height: number): string {
  const stepX = width / (values.length - 1);
  const pad = height * 0.06;
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = pad + (1 - v / 100) * (height - pad * 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function endpointY(value: number, height: number): number {
  const pad = height * 0.06;
  return pad + (1 - value / 100) * (height - pad * 2);
}

export default function MarketChart({
  ticker,
  side = "yes",
  yesPricePoints,
  noPricePoints,
}: MarketChartProps) {
  const { t } = useTranslation("prediction");
  const [range, setRange] = useState<TimeRange>("1D");
  const [history, setHistory] = useState<MarketPriceHistory | null>(null);
  const [fetchStatus, setFetchStatus] = useState<ChartFetchStatus>("loading");
  const [retryNonce, setRetryNonce] = useState(0);
  const activePricePoints =
    side === "no" ? (noPricePoints ?? 100 - yesPricePoints) : yesPricePoints;

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

  const {
    state: chartState,
    values,
    synthetic,
  } = useMemo(() => {
    const realValues = history
      ? history.points.map((p) =>
          side === "no" ? 100 - p.yesPricePoints : p.yesPricePoints,
        )
      : null;
    return resolveChartSeries({
      fetchStatus,
      realValues,
      currentPricePoints: activePricePoints,
      syntheticSeed: `${ticker}-${side}`,
      range,
      syntheticFallbackEnabled: DEMO_SYNTHETIC_CHARTS,
    });
  }, [fetchStatus, history, ticker, side, range, activePricePoints]);
  const width = 800;
  const height = 300;
  // Selected side draws at full strength; its complement draws muted so
  // the binary reads as one market with two mirrored outcomes.
  const complementValues = useMemo(() => values.map((v) => 100 - v), [values]);
  const line = values.length >= 2 ? buildPath(values, width, height) : "";
  const complementLine =
    complementValues.length >= 2
      ? buildPath(complementValues, width, height)
      : "";
  // Keep the chart series tied to the selected contract side so NO matches
  // the NO button even when the NO price is moving up.
  const lineColor = side === "no" ? "var(--no-text)" : "var(--yes-text)";
  const complementColor = side === "no" ? "var(--yes-text)" : "var(--no-text)";
  const lineEndY = values.length
    ? endpointY(values[values.length - 1], height)
    : 0;
  const complementEndY = complementValues.length
    ? endpointY(complementValues[complementValues.length - 1], height)
    : 0;

  return (
    <section className={`${CHART_CARD_CLASS} relative`}>
      {synthetic && (
        <span className="absolute right-3 top-3 z-10 rounded-[var(--r-pill)] border border-[var(--border-1)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--t3)]">
          {t("SIMULATED_DATA", "Simulated data")}
        </span>
      )}
      {chartState === "loading" && (
        <div
          className="h-[300px] w-full animate-pulse rounded-[var(--r-rh-sm)] bg-[var(--surface-2)]"
          role="status"
          aria-label={t("CHART_LOADING")}
        />
      )}

      {chartState === "error" && (
        <div className="flex h-[300px] w-full flex-col items-center justify-center gap-3 rounded-[var(--r-rh-sm)] border border-[var(--border-1)] bg-[var(--surface-2)]">
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
          <path
            d={complementLine}
            stroke={complementColor}
            strokeOpacity="0.35"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={line}
            stroke={lineColor}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <g transform={`translate(${width},${complementEndY})`}>
            <circle r="3" fill={complementColor} fillOpacity="0.45" />
          </g>
          <g transform={`translate(${width},${lineEndY})`}>
            <circle
              r="4.5"
              fill={lineColor}
              stroke="var(--surface-1)"
              strokeWidth="1.5"
            />
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
    </section>
  );
}
