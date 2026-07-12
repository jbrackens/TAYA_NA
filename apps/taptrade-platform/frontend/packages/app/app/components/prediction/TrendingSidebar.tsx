"use client";

/**
 * TrendingSidebar — the movers rail next to the DiscoveryHero on /predict.
 * The component file name stays `TrendingSidebar` for import stability.
 *
 * P10 honesty contract (2026-07-12): every delta and sparkline on this
 * rail comes from the real 1-day price series (useMarketHistories). The
 * former ticker-hash placeholder deltas and seeded-walk sparklines are
 * deleted. Rows whose market has no drawable history show the price
 * alone with a neutral "—" — no invented movement. When real movement
 * exists, rows are ranked by |Δ| and the module honestly earns its
 * "Top movers" name; the pulsing "24H" live dot is gone (movement is a
 * fact, not a broadcast).
 *
 * Prices are always the YES side, labeled — the previous unlabeled
 * "leading side" price rendered Norway as 94¢ here and 6¢ in the hero
 * (audit finding H5).
 *
 * Color discipline (DESIGN.md §3):
 *   - seafoam --yes-*: up-direction (sparkline up, delta-up pill)
 *   - coral --no-*: down-direction
 */

import Link from "next/link";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { PredictionMarket } from "@taptrade-ui/api-client/src/prediction-types";
import { seriesDelta, sparklinePathFromSeries } from "./utils/spark";
import { useMarketHistories } from "./utils/useHeroPriceHistory";
import { categoryLabel, localizedMarket } from "./market-content";

interface Props {
  markets: PredictionMarket[];
  /** Maximum rows to render. Default 6 (matches rail height to hero). */
  limit?: number;
}

const CATEGORY_LABEL: Record<string, string> = {
  pol: "Politics",
  pres: "Politics",
  senate: "Senate",
  house: "Politics",
  fed: "Fed",
  fomc: "Fed",
  mlbb: "Esports",
  dota: "Esports",
  valorant: "Esports",
  nba: "Sports",
  nfl: "Sports",
  ucl: "Sports",
  spx: "Tech",
  aapl: "Tech",
  gpt: "Tech",
};

function categoryFromTicker(ticker: string): string {
  const prefix = ticker.split("-")[0]?.toLowerCase() ?? "";
  return CATEGORY_LABEL[prefix] ?? prefix.toUpperCase();
}

// P11: the movers rail is an editorial column — heavy top rule, small-
// caps rubric, rule-separated entries, serif questions, wire-mono
// figures. No hover fills, no card chrome.
const TOP_MOVERS_CLASS = "font-sans";
const TOP_MOVERS_HEADER_CLASS =
  "mb-1 flex items-baseline justify-between border-t-[3px] border-[var(--rule-ink)] pt-2";
const TOP_MOVERS_TITLE_CLASS =
  "m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--t1)]";
const TOP_MOVERS_WINDOW_CLASS =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--t4)]";
const TOP_MOVERS_LIST_CLASS = "m-0 list-none p-0";
const TOP_MOVERS_ROW_CLASS =
  "grid cursor-pointer grid-cols-[1fr_56px_auto] items-center gap-3 border-b border-[var(--border-1)] py-3 text-inherit no-underline last:border-b-0 [&:hover_h4]:underline";
const TOP_MOVERS_CATEGORY_CLASS =
  "mb-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--t4)]";
const TOP_MOVERS_QUESTION_CLASS =
  "type-display m-0 overflow-hidden [display:-webkit-box] text-[15px] font-medium leading-[1.25] text-[var(--t1)] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]";
const TOP_MOVERS_PRICE_CLASS =
  "font-mono text-[14px] font-semibold leading-none text-[var(--t1)] [font-variant-numeric:tabular-nums]";
const TOP_MOVERS_PRICE_SIDE_CLASS =
  "mr-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--t4)]";
const TOP_MOVERS_FOOTER_CLASS =
  "mt-2 border-t border-[var(--border-2)] pt-2";
const TOP_MOVERS_FOOTER_LINK_CLASS =
  "text-[12px] font-semibold text-[var(--accent-text)] no-underline hover:underline";

// P11: deltas are plain wire figures, not pills — print tables don't
// wear chips.
function deltaClass(up: boolean): string {
  return `mt-1 inline-block font-mono text-[11px] font-semibold [font-variant-numeric:tabular-nums] ${
    up ? "text-[var(--yes-text)]" : "text-[var(--no-text)]"
  }`;
}

const NEUTRAL_DELTA_CLASS =
  "mt-1 inline-block font-mono text-[11px] font-semibold text-[var(--t4)]";

export function TrendingSidebar({ markets, limit = 6 }: Props) {
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
  const candidates = useMemo(
    () => (markets ?? []).slice(0, Math.max(limit, 8)),
    [markets, limit],
  );
  const tickers = useMemo(() => candidates.map((m) => m.ticker), [candidates]);
  const histories = useMarketHistories(tickers);

  if (!markets || markets.length === 0) return null;

  // Rank by |real Δ| when we have movement; markets without drawable
  // history sort after moving ones, in their incoming (volume) order.
  const rows = candidates
    .map((m, idx) => {
      const history = histories[m.ticker];
      const delta = seriesDelta(history?.points);
      return { market: localizedMarket(contentT, m), delta, idx };
    })
    .sort((a, b) => {
      const av = a.delta ? Math.abs(a.delta.pct) : -1;
      const bv = b.delta ? Math.abs(b.delta.pct) : -1;
      if (av !== bv) return bv - av;
      return a.idx - b.idx;
    })
    .slice(0, limit);

  const anyMovement = rows.some((r) => r.delta && !r.delta.flat);

  return (
    <aside
      className={TOP_MOVERS_CLASS}
      aria-label={
        anyMovement ? t("TOP_MOVERS") : t("MOST_TRADED", "Most traded")
      }
    >
      <div className={TOP_MOVERS_HEADER_CLASS}>
        <h3 className={TOP_MOVERS_TITLE_CLASS}>
          {anyMovement ? t("TOP_MOVERS") : t("MOST_TRADED", "Most traded")}
        </h3>
        <span className={TOP_MOVERS_WINDOW_CLASS}>
          {anyMovement ? t("TODAY") : t("BY_VOLUME", "by volume")}
        </span>
      </div>
      <ul className={TOP_MOVERS_LIST_CLASS}>
        {rows.map(({ market: m, delta }) => {
          const history = histories[m.ticker];
          const spark = sparklinePathFromSeries(history?.points);
          const up = delta?.up ?? false;
          const sparkColor = up ? "var(--yes-text)" : "var(--no-text)";
          const cat = categoryLabel(
            contentT,
            m.categoryName || categoryFromTicker(m.ticker),
          );
          const deltaText =
            delta && !delta.flat
              ? `${up ? "+" : ""}${delta.pct.toFixed(1)}%`
              : "—";
          return (
            <li key={m.id}>
              <Link
                href={`/market/${m.ticker}`}
                className={TOP_MOVERS_ROW_CLASS}
                aria-label={`${m.title}, ${t("YES")} ${m.yesPricePoints}¢${delta ? `, ${deltaText} ${t("TODAY").toLowerCase()}` : ""}`}
              >
                <div className="min-w-0">
                  <div className={TOP_MOVERS_CATEGORY_CLASS}>{cat}</div>
                  <h4 className={TOP_MOVERS_QUESTION_CLASS}>{m.title}</h4>
                </div>
                <span className="h-7 w-[60px]" aria-hidden="true">
                  {spark && (
                    <svg
                      className="block h-full w-full"
                      viewBox="0 0 60 28"
                      preserveAspectRatio="none"
                    >
                      <path
                        d={spark}
                        stroke={sparkColor}
                        strokeWidth="1.5"
                        fill="none"
                      />
                    </svg>
                  )}
                </span>
                <div className="min-w-14 text-right">
                  <div className={TOP_MOVERS_PRICE_CLASS}>
                    <span className={TOP_MOVERS_PRICE_SIDE_CLASS}>
                      {t("YES")}
                    </span>
                    {m.yesPricePoints}¢
                  </div>
                  <span
                    className={delta ? deltaClass(up) : NEUTRAL_DELTA_CLASS}
                  >
                    {deltaText}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className={TOP_MOVERS_FOOTER_CLASS}>
        <Link href="/discover" className={TOP_MOVERS_FOOTER_LINK_CLASS}>
          {t("VIEW_ALL_TRENDING")} →
        </Link>
      </div>
    </aside>
  );
}
