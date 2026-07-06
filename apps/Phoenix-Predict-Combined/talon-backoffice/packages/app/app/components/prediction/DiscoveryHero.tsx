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
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";
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
  // Real backend-fetched series when available; falls back to the
  // deterministic walk during the fetch window or on failure (the
  // hook returns null in those cases and heroChartPath handles that).
  const heroPoints = useHeroPriceHistory(displayMarket.ticker);
  const chart = heroChartPath(
    displayMarket.ticker,
    yes,
    800,
    140,
    heroPoints ?? undefined,
  );
  const volumeLabel = formatHeroVolume(displayMarket.volumePointsCents);
  const oiLabel =
    displayMarket.openInterestPointsCents != null
      ? formatHeroVolume(displayMarket.openInterestPointsCents)
      : "—";
  const closesLabel = formatHeroCloseLeft(displayMarket.closeAt);
  const changeClass = isUp ? "text-[var(--yes-text)]" : "text-[var(--no-text)]";

  return (
    <section
      className="rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-7 font-sans max-[720px]:p-6"
      aria-label={t("FEATURED_MARKET")}
    >
      <header className="mb-3.5 flex items-center gap-2.5 text-xs font-medium text-[var(--t3)]">
        {displayMarket.status === "open" && (
          <>
            <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
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

      <h1 className="m-0 mb-4 max-w-[720px] text-[28px] font-semibold leading-[1.2] text-[var(--t1)] max-[720px]:mb-[18px] max-[720px]:text-[22px]">
        {displayMarket.title}
      </h1>

      <div
        className="m-0 mb-3 font-sans text-[88px] font-semibold leading-none text-[var(--t1)] tabular-nums max-[720px]:text-[64px]"
        aria-label={`Yes price ${yes} cents`}
      >
        {yes}
        <span className="ml-1 text-[56px] font-medium text-[var(--t3)] max-[720px]:text-[40px]">
          ¢
        </span>
      </div>
      <div
        className={`mb-[18px] inline-flex items-center gap-2.5 text-[17px] font-semibold tabular-nums ${changeClass}`}
      >
        <span aria-hidden="true">{isUp ? "▲" : "▼"}</span>
        {isUp ? "+" : ""}
        {delta}¢ ({isUp ? "+" : ""}
        {pct.toFixed(1)}%)
        <span className="text-sm font-medium text-[var(--t3)]">
          {t("TODAY")}
        </span>
      </div>

      <div className="mb-4">
        <svg
          className="block h-[140px] w-full max-[720px]:h-[120px]"
          viewBox="0 0 800 140"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="rh-chart-fill" x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor={isUp ? "var(--yes)" : "var(--no)"}
                stopOpacity="0.32"
              />
              <stop
                offset="100%"
                stopColor={isUp ? "var(--yes)" : "var(--no)"}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <path d={chart.fill} fill="url(#rh-chart-fill)" />
          <path
            d={chart.line}
            stroke={isUp ? "var(--yes-text)" : "var(--no-text)"}
            strokeWidth={2.5}
            fill="none"
          />
        </svg>
      </div>

      <div className="mt-5 flex gap-3 max-[720px]:mt-[18px]">
        <Link
          href={`/market/${displayMarket.ticker}`}
          className="inline-flex max-w-[280px] flex-1 items-center justify-center rounded-md border-0 bg-[var(--accent)] px-6 py-4 text-[15px] font-semibold text-[#061a10] no-underline tabular-nums transition-[filter,transform] duration-150 hover:-translate-y-px hover:brightness-105"
        >
          {t("BUY_YES")} · {yes}%
        </Link>
        <Link
          href={`/market/${displayMarket.ticker}`}
          className="inline-flex max-w-[280px] flex-1 items-center justify-center rounded-md border-0 bg-[var(--no-soft)] px-6 py-4 text-[15px] font-semibold text-[var(--no-text)] no-underline tabular-nums transition-colors duration-150 hover:bg-[rgba(255,139,107,0.22)]"
        >
          {t("BUY_NO")} · {no}%
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-6 border-t border-[var(--border-1)] pt-6 max-[720px]:grid-cols-2 max-[720px]:gap-4">
        <div>
          <div className="mb-1.5 text-xs text-[var(--t3)]">
            {t("24H_VOLUME")}
          </div>
          <div className="text-lg font-semibold text-[var(--t1)] tabular-nums">
            {volumeLabel}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-xs text-[var(--t3)]">
            {t("OPEN_INTEREST")}
          </div>
          <div className="text-lg font-semibold text-[var(--t1)] tabular-nums">
            {oiLabel}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-xs text-[var(--t3)]">{t("TRADERS")}</div>
          <div className="text-lg font-semibold text-[var(--t1)] tabular-nums">
            —
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-xs text-[var(--t3)]">{t("CLOSES")}</div>
          <div className="text-lg font-semibold text-[var(--t1)] tabular-nums">
            {closesLabel}
          </div>
        </div>
      </div>
    </section>
  );
}
