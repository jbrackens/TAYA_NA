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
import { deterministicDelta, heroChartPath } from "./utils/spark";
import { useHeroPriceHistory } from "./utils/useHeroPriceHistory";
import { categoryLabel, localizedMarket } from "./market-content";

function formatHeroVolume(cents: number): string {
  const points = cents / 100;
  if (points >= 1_000_000) return `${(points / 1_000_000).toFixed(1)}M pts`;
  if (points >= 1_000) return `${(points / 1_000).toFixed(1)}K pts`;
  return `${points.toFixed(0)} pts`;
}

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
  const yes = displayMarket.yesPricePointsCents;
  const no = displayMarket.noPricePointsCents;
  const { delta, pct } = deterministicDelta(displayMarket.ticker, yes);
  const isUp = delta >= 0;
  const isFlat = delta === 0;
  // Real backend-fetched series when available; falls back to the
  // deterministic walk during the fetch window or on failure (the
  // hook returns null in those cases and heroChartPath handles that).
  const heroPoints = useHeroPriceHistory(displayMarket.ticker);
  const chart = heroChartPath(
    displayMarket.ticker,
    yes,
    800,
    320,
    heroPoints ?? undefined,
  );
  const chartMobile = heroChartPath(
    displayMarket.ticker,
    yes,
    800,
    150,
    heroPoints ?? undefined,
  );
  const volumeLabel = formatHeroVolume(displayMarket.volumePointsCents);
  const oiLabel =
    displayMarket.openInterestPointsCents != null &&
    displayMarket.openInterestPointsCents > 0
      ? formatHeroVolume(displayMarket.openInterestPointsCents)
      : "—";
  const closesLabel = formatHeroCloseLeft(displayMarket.closeAt);
  const changeClass = isFlat
    ? "text-[var(--t3)]"
    : isUp
      ? "text-[var(--yes-text)]"
      : "text-[var(--no-text)]";

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
                    className="h-[7px] w-[7px] animate-pulse rounded-full bg-[var(--accent)] shadow-[0_0_0_4px_rgba(43,228,128,0.18)]"
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
            className="type-display m-0 mb-2.5 text-[clamp(56px,5.5vw,84px)] font-semibold leading-none tracking-[-0.02em] text-[var(--t1)]"
            aria-label={`Yes price ${yes} cents`}
          >
            {yes}
            <span className="ml-1 text-[0.62em] font-medium text-[var(--t4)]">
              ¢
            </span>
          </div>
          <div
            className={`mb-6 inline-flex items-center gap-2.5 text-[16px] font-semibold tabular-nums ${changeClass}`}
          >
            {!isFlat && (
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                aria-hidden="true"
                className={isUp ? "" : "rotate-180"}
              >
                <path d="M5 1.2 8.8 8H1.2Z" fill="currentColor" />
              </svg>
            )}
            {isUp && !isFlat ? "+" : ""}
            {delta}¢ ({isUp && !isFlat ? "+" : ""}
            {pct.toFixed(1)}%)
            <span className="text-sm font-medium text-[var(--t3)]">
              {t("TODAY")}
            </span>
          </div>

          {/* Mobile chart: sits between the price block and the actions */}
          <div className="mb-6 hidden max-[980px]:block">
            <svg
              className="block h-[150px] w-full overflow-visible"
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
          </div>

          <div className="mt-auto flex gap-3">
            <Link
              href={`/market/${displayMarket.ticker}`}
              className="inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-md border-0 bg-[var(--accent)] px-6 py-[15px] text-[15px] font-semibold text-[#061a10] no-underline tabular-nums shadow-[0_1px_2px_rgba(13,17,20,0.08)] transition-[background-color,transform,box-shadow] duration-150 ease-out hover:-translate-y-px hover:bg-[#54ec9b] hover:shadow-[0_3px_8px_rgba(43,228,128,0.35)] active:translate-y-0 active:shadow-[0_1px_2px_rgba(13,17,20,0.08)] max-[720px]:px-4 max-[720px]:text-[14px]"
            >
              {t("BUY_YES")} · {yes}¢
            </Link>
            <Link
              href={`/market/${displayMarket.ticker}`}
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
        </div>

      </div>
    </section>
  );
}
