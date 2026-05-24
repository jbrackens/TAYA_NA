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
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
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
      <section
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border-1)",
          borderRadius: "var(--r-rh-lg)",
          padding: 36,
          minHeight: 480,
          color: "var(--t3)",
        }}
      >
        {t("LOADING_MARKETS")}
      </section>
    );
  }

  const displayMarket = localizedMarket(contentT, market);
  const displayCategory = categoryName
    ? categoryLabel(contentT, categoryName)
    : "";
  const yes = displayMarket.yesPriceCents;
  const no = displayMarket.noPriceCents;
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
  const volumeLabel = formatHeroVolume(displayMarket.volumeCents);
  const oiLabel =
    displayMarket.openInterestCents != null
      ? formatHeroVolume(displayMarket.openInterestCents)
      : "—";
  const closesLabel = formatHeroCloseLeft(displayMarket.closeAt);

  return (
    <>
      <style>{`
        .rh-hero {
          background: var(--surface-1);
          border: 1px solid var(--border-1);
          border-radius: var(--r-rh-lg);
          padding: 28px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .rh-hero-eyebrow {
          display: flex; align-items: center; gap: 10px;
          font-size: 12px; font-weight: 500;
          color: var(--t3);
          margin-bottom: 14px;
        }
        .rh-hero-eyebrow .live {
          display: inline-flex; gap: 6px; align-items: center;
          color: var(--accent); font-weight: 600;
          letter-spacing: 0.08em;
        }
        .rh-hero-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 0 4px rgba(43, 228, 128, 0.18);
          animation: rh-pulse 2s ease-in-out infinite;
        }
        @keyframes rh-pulse { 50% { opacity: 0.55; } }
        .rh-hero-q {
          font-family: 'Inter', sans-serif;
          font-size: 28px; font-weight: 600;
          line-height: 1.2; letter-spacing: -0.02em;
          margin: 0 0 16px;
          color: var(--t1);
          max-width: 720px;
        }
        .rh-bigprice {
          font-family: 'Inter Tight', 'Inter', sans-serif;
          font-size: 88px; font-weight: 600;
          line-height: 1; letter-spacing: -0.04em;
          font-variant-numeric: tabular-nums;
          color: var(--t1);
          margin: 0 0 12px;
        }
        .rh-bigprice .cents {
          font-size: 56px; color: var(--t3); font-weight: 500;
          margin-left: 4px;
        }
        .rh-change {
          display: inline-flex; align-items: center; gap: 10px;
          font-size: 17px; font-weight: 600;
          font-variant-numeric: tabular-nums;
          margin-bottom: 18px;
        }
        .rh-change.up    { color: var(--yes-text); }
        .rh-change.down  { color: var(--no-text); }
        .rh-change .arrow {
          display: inline-block;
          width: 0; height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
        }
        .rh-change.up   .arrow { border-bottom: 7px solid var(--yes-text); }
        .rh-change.down .arrow { border-top:    7px solid var(--no-text); }
        .rh-change .label {
          color: var(--t3); font-weight: 500; font-size: 14px;
        }

        .rh-chart { margin-bottom: 16px; }
        .rh-chart svg { width: 100%; height: 140px; display: block; }
        .rh-periods {
          display: flex; gap: 4px;
          margin-top: 14px;
        }
        .rh-period {
          padding: 6px 14px;
          border-radius: var(--r-pill);
          background: transparent;
          color: var(--t3);
          font-size: 12px; font-weight: 600;
          font-family: inherit;
          border: 0; cursor: pointer;
        }
        .rh-period:hover { color: var(--t1); }
        .rh-period.is-active {
          background: var(--accent-soft);
          color: var(--accent);
        }

        .rh-actions {
          display: flex; gap: 12px;
          margin-top: 20px;
        }
        .rh-buy-yes, .rh-buy-no {
          flex: 1; max-width: 280px;
          display: inline-flex; align-items: center; justify-content: center;
          font-family: inherit;
          font-weight: 600; font-size: 15px;
          padding: 16px 24px;
          border: 0; border-radius: var(--r-pill);
          cursor: pointer; text-decoration: none;
          font-variant-numeric: tabular-nums;
          transition: filter 120ms ease, background 120ms ease, transform 120ms ease;
        }
        .rh-buy-yes {
          background: var(--accent);
          color: #061a10;
        }
        .rh-buy-yes:hover { filter: brightness(1.05); transform: translateY(-1px); }
        .rh-buy-no {
          background: var(--no-soft);
          color: var(--no-text);
        }
        .rh-buy-no:hover { background: rgba(255, 139, 107, 0.22); }

        .rh-stats {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid var(--border-1);
        }
        .rh-stat-label {
          font-size: 12px; color: var(--t3);
          margin-bottom: 6px;
        }
        .rh-stat-value {
          font-size: 18px; font-weight: 600;
          color: var(--t1);
          font-variant-numeric: tabular-nums;
        }

        @media (max-width: 720px) {
          .rh-hero { padding: 24px; }
          .rh-bigprice { font-size: 64px; }
          .rh-bigprice .cents { font-size: 40px; }
          .rh-hero-q { font-size: 22px; margin-bottom: 18px; }
          .rh-change { margin-bottom: 18px; }
          .rh-chart svg { height: 120px; }
          .rh-actions { margin-top: 18px; }
          .rh-stats { grid-template-columns: repeat(2, 1fr); gap: 16px; }
        }
      `}</style>
      <section className="rh-hero" aria-label={t("FEATURED_MARKET")}>
        <header className="rh-hero-eyebrow">
          {displayMarket.status === "open" && (
            <>
              <span className="live">
                <span className="rh-hero-dot" aria-hidden="true" />
                {t("LIVE")}
              </span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span>
            {displayCategory ? `${displayCategory.toUpperCase()} · ` : ""}
            {displayMarket.ticker}
          </span>
        </header>

        <h1 className="rh-hero-q">{displayMarket.title}</h1>

        <div className="rh-bigprice" aria-label={`Yes price ${yes} cents`}>
          {yes}
          <span className="cents">¢</span>
        </div>
        <div className={`rh-change ${isUp ? "up" : "down"}`}>
          <span className="arrow" aria-hidden="true" />
          {isUp ? "+" : ""}
          {delta}¢ ({isUp ? "+" : ""}
          {pct.toFixed(1)}%)
          <span className="label">{t("TODAY")}</span>
        </div>

        <div className="rh-chart">
          <svg viewBox="0 0 800 140" preserveAspectRatio="none">
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

        <div className="rh-actions">
          <Link href={`/market/${displayMarket.ticker}`} className="rh-buy-yes">
            {t("BUY_YES")} · {yes}¢
          </Link>
          <Link href={`/market/${displayMarket.ticker}`} className="rh-buy-no">
            {t("BUY_NO")} · {no}¢
          </Link>
        </div>

        <div className="rh-stats">
          <div>
            <div className="rh-stat-label">{t("24H_VOLUME")}</div>
            <div className="rh-stat-value">{volumeLabel}</div>
          </div>
          <div>
            <div className="rh-stat-label">{t("OPEN_INTEREST")}</div>
            <div className="rh-stat-value">{oiLabel}</div>
          </div>
          <div>
            <div className="rh-stat-label">{t("TRADERS")}</div>
            <div className="rh-stat-value">—</div>
          </div>
          <div>
            <div className="rh-stat-label">{t("CLOSES")}</div>
            <div className="rh-stat-value">{closesLabel}</div>
          </div>
        </div>
      </section>
    </>
  );
}
