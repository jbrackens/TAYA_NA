"use client";

/**
 * DiscoveryHero — the featured-market hero on /predict (DESIGN.md §7).
 * Extracted from predict/page.tsx so it can be rendered standalone or as
 * a slide inside FeaturedCarousel without any visual divergence. Pure
 * presentation: the caller supplies the market.
 *
 * P10 honesty contract (2026-07-12): the delta pill and the chart derive
 * from the SAME real price series (useMarketHistory). While the series
 * is loading, absent, or errored, the hero shows a neutral "—" and an
 * honest chart state — never a fabricated walk. The only exception is
 * the demo flag (NEXT_PUBLIC_DEMO_SYNTHETIC_CHARTS), whose synthetic
 * fallback renders under a visible "Simulated" chip.
 */

import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { PredictionMarket } from "@taptrade-ui/api-client/src/prediction-types";
import { heroChartPath, seriesDelta } from "./utils/spark";
import { useMarketHistory } from "./utils/useHeroPriceHistory";
import { samplePath } from "./market-chart-state";
import { DEMO_SYNTHETIC_CHARTS } from "../../lib/features";
import { categoryLabel, localizedMarket } from "./market-content";
import { formatCompactPoints } from "./market-display";

function formatHeroCloseLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "closed";
  const days = ms / 86_400_000;
  if (days >= 1) return `${Math.floor(days)}d`;
  const hours = ms / 3_600_000;
  if (hours >= 1) return `${Math.floor(hours)}h`;
  const mins = ms / 60_000;
  return `${Math.max(1, Math.floor(mins))}m`;
}

const SIM_CHIP_CLASS =
  "pointer-events-none absolute right-2 top-2 z-[1] rounded-[var(--r-pill)] border border-[var(--border-2)] bg-[var(--surface-1)] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--t3)]";

function HeroChart({
  values,
  synthetic,
  simulatedLabel,
  up,
  height,
  className,
  gradientId,
}: {
  values: number[] | null;
  synthetic: boolean;
  simulatedLabel: string;
  up: boolean;
  height: number;
  className: string;
  gradientId: string;
}) {
  const chart = heroChartPath(values, 800, height);
  if (!chart) return null;
  const stroke = up ? "var(--yes-text)" : "var(--no-text)";
  return (
    <div className="relative min-w-0">
      {synthetic && <span className={SIM_CHIP_CLASS}>{simulatedLabel}</span>}
      <svg
        className={className}
        viewBox={`0 0 800 ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="0%"
              stopColor={up ? "var(--yes)" : "var(--no)"}
              stopOpacity="0.13"
            />
            <stop
              offset="72%"
              stopColor={up ? "var(--yes)" : "var(--no)"}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        <line
          x1="0"
          x2="800"
          y1={chart.baselineY}
          y2={chart.baselineY}
          stroke="var(--border-2)"
          strokeWidth="1"
          strokeDasharray="2 6"
          vectorEffect="non-scaling-stroke"
        />
        <path d={chart.fill} fill={`url(#${gradientId})`} />
        <path
          d={chart.line}
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={chart.end.x}
          cy={chart.end.y}
          r={7}
          fill={up ? "var(--yes)" : "var(--no)"}
          opacity={0.35}
          className="origin-center animate-ping [transform-box:fill-box] motion-reduce:hidden"
        />
        <circle
          cx={chart.end.x}
          cy={chart.end.y}
          r={4}
          fill={stroke}
          stroke="var(--surface-1)"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}

export function DiscoveryHero({
  market,
  categoryName,
}: {
  market: PredictionMarket | null;
  categoryName?: string;
}) {
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
  const history = useMarketHistory(market?.ticker ?? "");
  if (!market) {
    return (
      <section className="min-h-[480px] rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-9 text-[var(--t3)]">
        {t("LOADING_MARKETS")}
      </section>
    );
  }

  const displayMarket = localizedMarket(contentT, market);
  const resolvedCategoryName = categoryName || market.categoryName || "";
  const displayCategory = resolvedCategoryName
    ? categoryLabel(contentT, resolvedCategoryName)
    : "";
  // Machine-generated import tickers (IMP-<hex>) are data plumbing, not
  // content — the eyebrow shows the category alone for those markets.
  const isMachineTicker = /^IMP-[0-9A-F]{6,}$/i.test(displayMarket.ticker);
  const eyebrowMeta = [
    displayCategory ? displayCategory.toUpperCase() : "",
    isMachineTicker ? "" : displayMarket.ticker,
  ]
    .filter(Boolean)
    .join(" · ");
  const yes = displayMarket.yesPricePoints;
  const no = displayMarket.noPricePoints;

  // One source of truth: the fetched real series drives BOTH the chart
  // and the delta pill. The demo flag may substitute a labeled synthetic
  // series for the chart, but never for the delta.
  const delta = seriesDelta(history.points);
  const syntheticValues =
    DEMO_SYNTHETIC_CHARTS && history.state !== "ready"
      ? samplePath(`${displayMarket.ticker}-hero`, "1d", yes)
      : null;
  const chartValues = history.points ?? syntheticValues;
  const chartSynthetic = syntheticValues !== null;
  const chartUp = chartSynthetic
    ? (chartValues?.[chartValues.length - 1] ?? 0) >= (chartValues?.[0] ?? 0)
    : (delta?.up ?? true);
  const isUp = delta ? delta.up : true;
  const isFlat = delta ? delta.flat : true;
  const volumeLabel = `${formatCompactPoints(displayMarket.volumePoints)}`;
  const oiLabel =
    displayMarket.openInterestPoints != null &&
    displayMarket.openInterestPoints > 0
      ? `${formatCompactPoints(displayMarket.openInterestPoints)}`
      : "—";
  const closesLabel = formatHeroCloseLeft(displayMarket.closeAt);

  return (
    <section
      className="rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-7 font-sans shadow-[var(--shadow-card)] max-[720px]:p-6"
      aria-label={t("FEATURED_MARKET")}
    >
      <div className="grid grid-cols-[minmax(300px,5fr)_7fr] gap-10 max-[980px]:grid-cols-1 max-[980px]:gap-6">
        {/* ── Left column: identity, price, actions ─────────────────── */}
        <div className="flex min-w-0 flex-col">
          <header className="mb-3.5 flex items-center gap-2.5 text-xs font-medium text-[var(--t3)]">
            {displayMarket.status === "open" && (
              <>
                <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.08em] text-[var(--yes-text)]">
                  <span
                    className="h-[7px] w-[7px] animate-pulse rounded-full bg-[var(--brand-period)] shadow-[0_0_0_4px_rgba(16,200,160,0.16)]"
                    aria-hidden="true"
                  />
                  {t("LIVE")}
                </span>
                {eyebrowMeta ? <span aria-hidden="true">·</span> : null}
              </>
            )}
            {eyebrowMeta ? <span>{eyebrowMeta}</span> : null}
          </header>

          {/* min-h reserves exactly two title lines so slides with 1-line
              and 2-line titles occupy identical vertical space — otherwise
              slide changes pump the page height and everything below
              visibly jumps. */}
          <h1
            className="type-display m-0 mb-5 line-clamp-2 min-h-[2.32em] text-[clamp(22px,1.6vw+14px,30px)] font-semibold leading-[1.16] text-[var(--t1)] max-[720px]:mb-[18px]"
            title={displayMarket.title}
          >
            {displayMarket.title}
          </h1>

          <div
            className="type-display m-0 mb-3 text-[clamp(64px,7vw,110px)] font-semibold leading-[0.95] tracking-[-0.03em] text-[var(--t1)]"
            aria-label={`Yes price ${yes} cents`}
          >
            {yes}
            <span className="ml-1 text-[0.62em] font-medium text-[var(--t3)]">
              ¢
            </span>
          </div>
          <div className="mb-6 flex items-center gap-2.5 max-[980px]:mb-4">
            {delta && !isFlat ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[13px] font-semibold tabular-nums ${
                  isUp
                    ? "bg-[var(--yes-soft)] text-[var(--yes-text)]"
                    : "bg-[var(--no-soft)] text-[var(--no-text)]"
                }`}
              >
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 10 10"
                  aria-hidden="true"
                  className={isUp ? "" : "rotate-180"}
                >
                  <path d="M5 1.2 8.8 8H1.2Z" fill="currentColor" />
                </svg>
                {isUp ? "+" : ""}
                {delta.delta}¢ ({isUp ? "+" : ""}
                {delta.pct.toFixed(1)}%)
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-[var(--surface-2)] px-2.5 py-1 font-mono text-[13px] font-semibold tabular-nums text-[var(--t3)]">
                {history.state === "loading" ? "…" : "—"}
              </span>
            )}
            <span className="text-sm font-medium text-[var(--t3)]">
              {t("TODAY")}
            </span>
          </div>

          {/* Mobile chart: sits between the price block and the actions */}
          <div className="mb-5 hidden max-[980px]:block">
            <HeroChart
              values={chartValues}
              synthetic={chartSynthetic}
              simulatedLabel={t("SIMULATED", "Simulated")}
              up={chartUp}
              height={150}
              className="block h-[128px] w-full overflow-visible"
              gradientId="rh-chart-fill-m"
            />
          </div>

          <div className="mt-auto flex gap-3">
            <Link
              href={`/market/${displayMarket.ticker}?side=yes`}
              className="inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-md border border-[var(--yes-border,var(--border-1))] bg-[var(--surface-1)] px-6 py-[15px] text-[15px] font-semibold text-[var(--yes-text)] no-underline tabular-nums transition-[background-color,border-color] duration-150 ease-out hover:border-[var(--yes)] hover:bg-[var(--yes-soft)] max-[720px]:px-4 max-[720px]:text-[14px]"
            >
              {t("BUY_YES")} · {yes}¢
            </Link>
            <Link
              href={`/market/${displayMarket.ticker}?side=no`}
              className="inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-md border border-[var(--no-border)] bg-[var(--surface-1)] px-6 py-[15px] text-[15px] font-semibold text-[var(--no-text)] no-underline tabular-nums transition-[background-color,border-color] duration-150 ease-out hover:border-[var(--no)] hover:bg-[var(--no-soft)] max-[720px]:px-4 max-[720px]:text-[14px]"
            >
              {t("BUY_NO")} · {no}¢
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-6 border-t border-[var(--border-1)] pt-5 max-[720px]:gap-4">
            <div>
              <div className="mb-1.5 text-xs text-[var(--t3)]">
                {t("24H_VOLUME")}
              </div>
              <div className="type-display whitespace-nowrap text-[18px] font-semibold text-[var(--t1)] tabular-nums max-[720px]:text-[16px]">
                {volumeLabel}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-xs text-[var(--t3)]">
                {t("OPEN_INTEREST")}
              </div>
              <div className="type-display whitespace-nowrap text-[18px] font-semibold text-[var(--t1)] tabular-nums max-[720px]:text-[16px]">
                {oiLabel}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-xs text-[var(--t3)]">
                {t("CLOSES")}
              </div>
              <div className="type-display whitespace-nowrap text-[18px] font-semibold text-[var(--t1)] tabular-nums max-[720px]:text-[16px]">
                {closesLabel}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column: the chart owns it ───────────────────────── */}
        <div className="relative min-w-0 max-[980px]:hidden">
          {chartValues && chartValues.length >= 2 ? (
            <HeroChart
              values={chartValues}
              synthetic={chartSynthetic}
              simulatedLabel={t("SIMULATED", "Simulated")}
              up={chartUp}
              height={320}
              className="block h-full min-h-[320px] w-full overflow-visible"
              gradientId="rh-chart-fill"
            />
          ) : (
            <div
              className="flex h-full min-h-[320px] w-full items-center justify-center rounded-[var(--r-rh-sm)] border border-dashed border-[var(--border-1)] text-[12px] text-[var(--t3)]"
              role="status"
            >
              {history.state === "loading"
                ? t("CHART_LOADING", "Loading price history…")
                : history.state === "error"
                  ? t("CHART_UNAVAILABLE", "Price history unavailable")
                  : t("CHART_NO_TRADES", "No price movement yet")}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
