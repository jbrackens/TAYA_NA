"use client";

/**
 * DiscoveryHero — the premium "stock-detail" featured-market hero
 * (DESIGN.md §7: warm-light surface, big YES price, gradient chart,
 * Buy YES / Buy NO, stat row). Extracted from predict/page.tsx so it can be
 * rendered standalone or as a slide inside FeaturedCarousel without any
 * visual divergence. Pure presentation: the caller supplies the market.
 */

import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { PredictionMarket } from "@taptrade-ui/api-client/src/prediction-types";
import { heroChartPath, syntheticHeroValues } from "./utils/spark";
import { useHeroPriceHistory } from "./utils/useHeroPriceHistory";
import { categoryLabel, localizedMarket } from "./market-content";
import { formatCompactPoints } from "../../lib/points";
import { DEMO_SYNTHETIC_CHARTS } from "../../lib/features";

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

// HERO_PERIODS was the placeholder timeframe tab bar. The backend price-
// history endpoint isn't wired yet (see MarketChart.tsx:9 and TODOS.md
// "backend price-history endpoint + wire real charts"), so the tabs sat
// permanently disabled — a "this looks broken" tell on the home page.
// Hidden until real history lands. Restore the bar when the endpoint
// exists.

export function DiscoveryHero({
  market,
  categoryName,
}: {
  market: PredictionMarket | null;
  categoryName?: string;
}) {
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
  // Hooks must run on every render in the same order (React invariant —
  // this component previously early-returned above the history hook, so
  // the null→market transition crashed with "rendered more hooks than
  // during the previous render"). While market is null the hook gets an
  // empty ticker and fetches nothing.
  const displayMarket = market ? localizedMarket(contentT, market) : null;
  const {
    points: heroPoints,
    movement,
    loading: historyLoading,
  } = useHeroPriceHistory(displayMarket?.ticker ?? "");
  if (!market || !displayMarket) {
    return (
      <section className="min-h-[480px] rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-9 text-[var(--t3)]">
        {t("LOADING_MARKETS")}
      </section>
    );
  }

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
  // 2026-07-12 integrity fix: the delta pill renders ONLY from the real
  // /prices series (movement is null while loading / when the series is
  // flat or missing — the pill hides instead of inventing a number).
  // The hook call itself lives above the early return with the other
  // hooks; only the derived values are computed here.
  const isUp = movement ? movement.up : yes >= no;
  const isFlat = movement ? movement.deltaPoints === 0 : true;
  // Chart fill: real series when available; on the demo box only
  // (NEXT_PUBLIC_DEMO_SYNTHETIC_CHARTS) a labeled synthetic shape keeps
  // the hero visual while history loads or is absent; otherwise no line
  // is drawn — loading/empty stay honest.
  const syntheticChart = heroPoints == null && DEMO_SYNTHETIC_CHARTS;
  const chartValues =
    heroPoints ??
    (syntheticChart ? syntheticHeroValues(displayMarket.ticker, yes) : null);
  const chart = chartValues ? heroChartPath(chartValues, 800, 320) : null;
  const chartMobile = chartValues ? heroChartPath(chartValues, 800, 150) : null;
  const volumeLabel = formatCompactPoints(displayMarket.volumePoints);
  const oiLabel =
    displayMarket.openInterestPoints != null &&
    displayMarket.openInterestPoints > 0
      ? formatCompactPoints(displayMarket.openInterestPoints)
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
                <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.08em] text-[var(--live-text)]">
                  <span
                    className="h-[7px] w-[7px] animate-pulse rounded-full bg-[var(--live)] shadow-[0_0_0_4px_var(--live-soft)]"
                    aria-hidden="true"
                  />
                  {t("LIVE")}
                </span>
                {eyebrowMeta ? <span aria-hidden="true">·</span> : null}
              </>
            )}
            {eyebrowMeta ? <span>{eyebrowMeta}</span> : null}
          </header>

          {/* min-h reserves exactly two title lines so carousel slides with
              1-line and 2-line titles occupy identical vertical space — the
              auto-advance otherwise pumps the page height and everything
              below visibly jumps (the reported scroll-glitch). */}
          <h1
            className="type-display m-0 mb-5 line-clamp-2 min-h-[2.32em] text-[clamp(22px,1.6vw+14px,30px)] font-semibold leading-[1.16] text-[var(--t1)] max-[720px]:mb-[18px]"
            title={displayMarket.title}
          >
            {displayMarket.title}
          </h1>

          <div
            role="img"
            className="type-display m-0 mb-3 text-[clamp(64px,7vw,110px)] font-semibold leading-[0.95] tracking-[-0.03em] text-[var(--t1)]"
            aria-label={`Yes price ${yes} cents`}
          >
            {yes}
            <span className="ml-1 text-[0.62em] font-medium text-[var(--t4)]">
              ¢
            </span>
          </div>
          <div className="mb-6 flex min-h-[30px] items-center gap-2.5 max-[980px]:mb-4">
            {movement ? (
              <>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[13px] font-semibold tabular-nums ${
                    isFlat
                      ? "bg-[var(--surface-2)] text-[var(--t3)]"
                      : isUp
                        ? "bg-[var(--yes-soft)] text-[var(--yes-text)]"
                        : "bg-[var(--no-soft)] text-[var(--no-text)]"
                  }`}
                >
                  {!isFlat && (
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 10 10"
                      aria-hidden="true"
                      className={isUp ? "" : "rotate-180"}
                    >
                      <path d="M5 1.2 8.8 8H1.2Z" fill="currentColor" />
                    </svg>
                  )}
                  {isUp && !isFlat ? "+" : ""}
                  {movement.deltaPoints}¢ ({isUp && !isFlat ? "+" : ""}
                  {movement.pct.toFixed(1)}%)
                </span>
                <span className="text-sm font-medium text-[var(--t3)]">
                  {t("TODAY")}
                </span>
              </>
            ) : historyLoading ? (
              <span
                className="inline-flex items-center rounded-md bg-[var(--surface-2)] px-2.5 py-1 font-mono text-[13px] font-semibold text-[var(--t4)]"
                aria-hidden="true"
              >
                —
              </span>
            ) : null}
          </div>

          {/* Mobile chart: sits between the price block and the actions */}
          <div className="relative mb-5 hidden max-[980px]:block">
            {syntheticChart && (
              <span className="absolute right-1 top-1 z-10 rounded-[var(--r-pill)] border border-[var(--border-1)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--t3)]">
                {t("SIMULATED_DATA", "Simulated data")}
              </span>
            )}
            {chartMobile && (
              <svg
                className="block h-[128px] w-full overflow-visible"
                viewBox="0 0 800 150"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient
                    id="rh-chart-fill-m"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={isUp ? "var(--yes)" : "var(--no)"}
                      stopOpacity="0.13"
                    />
                    <stop
                      offset="72%"
                      stopColor={isUp ? "var(--yes)" : "var(--no)"}
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>
                <path d={chartMobile.fill} fill="url(#rh-chart-fill-m)" />
                <path
                  d={chartMobile.line}
                  stroke={isUp ? "var(--yes-text)" : "var(--no-text)"}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={chartMobile.end.x}
                  cy={chartMobile.end.y}
                  r={4}
                  fill={isUp ? "var(--yes-text)" : "var(--no-text)"}
                  stroke="var(--surface-1)"
                  strokeWidth={1.5}
                />
              </svg>
            )}
          </div>

          <div className="mt-auto flex gap-3">
            <Link
              href={`/market/${displayMarket.ticker}`}
              className="inline-flex min-h-[52px] flex-1 items-center justify-center whitespace-nowrap rounded-xl border-0 bg-[var(--accent)] px-6 text-[15px] font-semibold text-[var(--ticket-cta-text)] no-underline tabular-nums transition-[filter,transform] duration-150 ease-out hover:-translate-y-px hover:brightness-[1.05] active:translate-y-0 max-[720px]:px-4 max-[720px]:text-[14px]"
            >
              {t("BUY_YES")} · {yes}¢
            </Link>
            <Link
              href={`/market/${displayMarket.ticker}`}
              className="inline-flex min-h-[52px] flex-1 items-center justify-center whitespace-nowrap rounded-xl border border-[var(--no-border)] bg-[var(--surface-1)] px-6 text-[15px] font-semibold text-[var(--no-text)] no-underline tabular-nums transition-[border-color] duration-150 ease-out hover:border-[var(--no)] max-[720px]:px-4 max-[720px]:text-[14px]"
            >
              {t("BUY_NO")} · {no}¢
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-6 border-t border-[var(--border-1)] pt-5 max-[720px]:gap-4">
            <div>
              <div className="mb-1.5 text-xs text-[var(--t3)]">
                {t("TOTAL_VOLUME", "Total volume")}
              </div>
              <div className="font-mono whitespace-nowrap text-[16px] font-medium text-[var(--t1)] tabular-nums">
                {volumeLabel}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-xs text-[var(--t3)]">
                {t("OPEN_INTEREST")}
              </div>
              <div className="font-mono whitespace-nowrap text-[16px] font-medium text-[var(--t1)] tabular-nums">
                {oiLabel}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-xs text-[var(--t3)]">
                {t("CLOSES")}
              </div>
              <div className="font-mono whitespace-nowrap text-[16px] font-medium text-[var(--t1)] tabular-nums">
                {closesLabel}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column: the chart owns it ───────────────────────── */}
        <div className="relative min-w-0 max-[980px]:hidden">
          {syntheticChart && (
            <span className="absolute right-2 top-2 z-10 rounded-[var(--r-pill)] border border-[var(--border-1)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--t3)]">
              {t("SIMULATED_DATA", "Simulated data")}
            </span>
          )}
          {!chart && (
            <div className="flex h-full min-h-[320px] w-full items-center justify-center rounded-[var(--r-rh-md)] border border-dashed border-[var(--border-1)] text-sm text-[var(--t3)]">
              {historyLoading
                ? t("CHART_LOADING", "Loading price history")
                : t("CHART_NO_HISTORY", "No price history yet")}
            </div>
          )}
          {chart && (
            <svg
              className="block h-full min-h-[320px] w-full overflow-visible"
              viewBox="0 0 800 320"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="rh-chart-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={isUp ? "var(--yes)" : "var(--no)"}
                    stopOpacity="0.13"
                  />
                  <stop
                    offset="72%"
                    stopColor={isUp ? "var(--yes)" : "var(--no)"}
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
              <path d={chart.fill} fill="url(#rh-chart-fill)" />
              <path
                d={chart.line}
                stroke={isUp ? "var(--yes-text)" : "var(--no-text)"}
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
                fill={isUp ? "var(--yes)" : "var(--no)"}
                opacity={0.35}
                className="origin-center animate-ping [transform-box:fill-box] motion-reduce:hidden"
              />
              <circle
                cx={chart.end.x}
                cy={chart.end.y}
                r={4}
                fill={isUp ? "var(--yes-text)" : "var(--no-text)"}
                stroke="var(--surface-1)"
                strokeWidth={1.5}
              />
            </svg>
          )}
        </div>
      </div>
    </section>
  );
}
