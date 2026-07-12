"use client";

/**
 * MarketChart — the market page price graphic
 * (P11 "Standing Question", 2026-07-12 — print-graphic pass).
 *
 * Draws BOTH sides of the binary from one history: the selected side's
 * line at full strength, its complement (100 − price) muted underneath —
 * the two lines mirror around 50¢ and cross. P11 annotates the plot like
 * a newspaper graphic: a lo/hi axis-figure column in wire mono on the
 * left and a source line underneath ("Source: TapTrade order flow · 1D").
 * The range switcher is a row of editorial text tabs (mono small caps,
 * active = ink underline).
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

const CHART_CARD_CLASS = "font-sans";
const CHART_SVG_CLASS = "block h-[300px] w-full";
// P11: the axis-figure column — hi over lo, right-aligned wire mono,
// mirroring the DiscoveryHero LeadChart print-graphic treatment.
const CHART_AXIS_CLASS =
  "flex w-9 shrink-0 flex-col justify-between py-0.5 text-right font-mono text-[10px] leading-none text-[var(--t3)] [font-variant-numeric:tabular-nums]";
const CHART_SOURCE_CLASS =
  "mt-1.5 pl-11 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--t4)]";
// P11: the range switcher is a row of editorial text tabs — mono small
// caps; active = ink text + 2px ink-rule underline; inactive = --t3.
const CHART_SWITCHER_CLASS = "flex items-center gap-5";
const CHART_BUTTON_BASE_CLASS =
  "cursor-pointer border-0 bg-transparent p-0 pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-[120ms] border-b-2";

function rangeButtonClass(active: boolean): string {
  return `${CHART_BUTTON_BASE_CLASS} ${
    active
      ? "text-[var(--t1)] border-[var(--rule-ink)]"
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
  // P11 axis figures — lo/hi of the DRAWN selected-side series, printed
  // as wire mono in the left column like a newspaper graphic's scale.
  const axisLo = values.length ? Math.min(...values) : null;
  const axisHi = values.length ? Math.max(...values) : null;
  const sourceLine = `${t("CHART_SOURCE_LINE", "Source: TapTrade order flow")} · ${range}`;

  return (
    <section className={CHART_CARD_CLASS}>
      {chartState === "loading" && (
        <div
          className="flex h-[300px] w-full items-center justify-center border border-dashed border-[var(--border-1)] text-[12px] text-[var(--t3)]"
          role="status"
          aria-label={t("CHART_LOADING")}
        >
          {t("CHART_LOADING")}
        </div>
      )}

      {chartState === "error" && (
        <div className="flex h-[300px] w-full flex-col items-center justify-center gap-3 border border-dashed border-[var(--border-1)]">
          <div className="text-sm font-medium text-[var(--t3)]">
            {t("PRICE_HISTORY_UNAVAILABLE")}
          </div>
          <button
            className="cursor-pointer border border-[var(--border-2)] bg-transparent px-4 py-1.5 font-sans text-xs font-semibold text-[var(--t1)] transition-colors duration-[120ms] hover:bg-[var(--action-soft)]"
            onClick={() => setRetryNonce((n) => n + 1)}
          >
            {t("RETRY")}
          </button>
        </div>
      )}

      {(chartState === "ready" || chartState === "empty") && (
        <figure className="relative m-0 min-w-0">
          {/* P10 honesty: the demo flag's synthetic walk must never be
              mistakable for real history — visible marker, always. */}
          {synthetic && (
            <span className="pointer-events-none absolute right-0 top-0 z-[1] border border-[var(--border-2)] bg-[var(--surface-1)] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--t3)]">
              {t("SIMULATED", "Simulated")}
            </span>
          )}
          <div className="flex items-stretch gap-2">
            {/* Axis figures — hi over lo, right-aligned wire mono. */}
            <div className={CHART_AXIS_CLASS} aria-hidden="true">
              <span>{axisHi !== null ? `${Math.round(axisHi)}¢` : ""}</span>
              <span>{axisLo !== null ? `${Math.round(axisLo)}¢` : ""}</span>
            </div>
            <svg
              className={CHART_SVG_CLASS}
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
              aria-label={t(
                side === "no" ? "NO_PRICE_CHART" : "YES_PRICE_CHART",
                {
                  ticker,
                },
              )}
            >
              {/* Complement line is dashed as well as muted so the two
                  sides differ by more than hue (WCAG 1.4.1). */}
              <path
                d={complementLine}
                stroke={complementColor}
                strokeOpacity="0.5"
                strokeWidth="1.5"
                strokeDasharray="5 5"
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
          </div>
          {/* Source line — the print graphic's provenance caption. */}
          <figcaption className={CHART_SOURCE_CLASS}>{sourceLine}</figcaption>
        </figure>
      )}

      <div className="mt-4 flex items-center justify-between gap-4">
        <div
          className={CHART_SWITCHER_CLASS}
          role="group"
          aria-label={t("TIME_RANGE")}
        >
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={r === range}
              className={rangeButtonClass(r === range)}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
        {/* Inline legend: names the solid vs dashed line (a11y + first-
            time readability). */}
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--t3)]">
          <span className="inline-flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden="true">
              <line
                x1="0"
                y1="3"
                x2="18"
                y2="3"
                stroke={lineColor}
                strokeWidth="2"
              />
            </svg>
            {side === "no" ? t("NO") : t("YES")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden="true">
              <line
                x1="0"
                y1="3"
                x2="18"
                y2="3"
                stroke={complementColor}
                strokeOpacity="0.6"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            </svg>
            {side === "no" ? t("YES") : t("NO")}
          </span>
        </div>
      </div>
    </section>
  );
}
