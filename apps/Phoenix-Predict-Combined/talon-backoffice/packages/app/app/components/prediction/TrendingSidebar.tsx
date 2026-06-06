"use client";

/**
 * TrendingSidebar — "Top Movers" rail next to the DiscoveryHero on /predict.
 *
 * Visual identity changed 2026-04-26 (Robinhood direction, see DESIGN.md
 * §7). Borderless flat list, mini sparkline + big price + delta pill per
 * row. The component file name stays as `TrendingSidebar` for import
 * stability while the visual identity is now "Top Movers."
 *
 * Reuses `discovery.trending` data; each row links to /market/[ticker].
 * Sparklines and 24h delta are deterministic from the ticker (placeholder
 * until backend exposes price history).
 *
 * Color discipline (DESIGN.md §3 strict two-greens):
 *   - mint --accent: actions/brand only (the live dot in the header)
 *   - seafoam --yes: up-direction (sparkline up, delta-up pill)
 *   - coral --no: down-direction
 */

import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";
import { deterministicDelta, sparklinePath } from "./utils/spark";
import { categoryLabel, localizedMarket } from "./market-content";

interface Props {
  markets: PredictionMarket[];
  /** Maximum rows to render. Default 6 (matches Top Movers height to hero). */
  limit?: number;
}

const CATEGORY_LABEL: Record<string, string> = {
  pol: "Politics",
  pres: "Politics",
  senate: "Senate",
  house: "Politics",
  fed: "Fed",
  fomc: "Fed",
  btc: "Crypto",
  eth: "Crypto",
  crypto: "Crypto",
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

const TOP_MOVERS_CLASS =
  "px-1 pt-2 pb-1 font-['Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif]";
const TOP_MOVERS_HEADER_CLASS =
  "mb-[18px] flex items-center justify-between px-2";
const TOP_MOVERS_TITLE_CLASS =
  "m-0 text-[18px] font-bold tracking-[-0.01em] text-[var(--t1)]";
const TOP_MOVERS_LIVE_CLASS =
  "inline-flex items-center gap-1.5 font-['IBM_Plex_Mono',_monospace] text-[10px] uppercase tracking-[0.18em] text-[#0f8a4c]";
const TOP_MOVERS_DOT_CLASS =
  "h-1.5 w-1.5 animate-pulse rounded-full bg-[#0f8a4c] shadow-[0_0_8px_rgba(15,138,76,0.35)] motion-reduce:animate-none";
const TOP_MOVERS_LIST_CLASS = "m-0 list-none p-0";
const TOP_MOVERS_ROW_CLASS =
  "grid cursor-pointer grid-cols-[1fr_60px_auto] items-center gap-[14px] rounded-[var(--r-rh-sm)] border-b border-[var(--border-1)] px-2 py-[14px] text-inherit no-underline transition-colors duration-[120ms] hover:bg-[var(--surface-2)] last:border-b-0";
const TOP_MOVERS_CATEGORY_CLASS = "mb-1 text-[11px] font-medium text-[#0f8a4c]";
const TOP_MOVERS_QUESTION_CLASS =
  "overflow-hidden [display:-webkit-box] text-[13px] font-medium leading-[1.3] text-[var(--t1)] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]";
const TOP_MOVERS_PRICE_CLASS =
  "font-['IBM_Plex_Mono',_monospace] text-[15px] font-semibold leading-none text-[var(--t1)] [font-variant-numeric:tabular-nums]";
const TOP_MOVERS_FOOTER_CLASS =
  "mt-[14px] border-t border-[var(--border-1)] px-2 pt-2.5 text-center";
const TOP_MOVERS_FOOTER_LINK_CLASS =
  "text-[13px] font-semibold text-[#0f8a4c] no-underline hover:underline";

function deltaClass(up: boolean): string {
  return `mt-[5px] inline-block rounded-[var(--r-pill)] px-[7px] py-0.5 font-['IBM_Plex_Mono',_monospace] text-[11px] font-semibold [font-variant-numeric:tabular-nums] ${
    up
      ? "bg-[var(--yes-soft)] text-[var(--yes-text)]"
      : "bg-[var(--no-soft)] text-[var(--no-text)]"
  }`;
}

export function TrendingSidebar({ markets, limit = 6 }: Props) {
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
  if (!markets || markets.length === 0) return null;
  const rows = markets.slice(0, limit).map((m) => localizedMarket(contentT, m));

  return (
    <aside className={TOP_MOVERS_CLASS} aria-label={t("TOP_MOVERS")}>
      <div className={TOP_MOVERS_HEADER_CLASS}>
        <h3 className={TOP_MOVERS_TITLE_CLASS}>{t("TOP_MOVERS")}</h3>
        <span className={TOP_MOVERS_LIVE_CLASS}>
          <span className={TOP_MOVERS_DOT_CLASS} aria-hidden="true" />
          24H
        </span>
      </div>
      <ul className={TOP_MOVERS_LIST_CLASS}>
        {rows.map((m) => {
          const yesLeads = m.yesPriceCents >= m.noPriceCents;
          const leadingPrice = yesLeads ? m.yesPriceCents : m.noPriceCents;
          const { pct, up } = deterministicDelta(m.ticker, leadingPrice);
          const sparkColor = up ? "var(--yes-text)" : "var(--no-text)";
          const cat = categoryLabel(contentT, categoryFromTicker(m.ticker));
          return (
            <li key={m.id}>
              <Link
                href={`/market/${m.ticker}`}
                className={TOP_MOVERS_ROW_CLASS}
                aria-label={`${m.title}, ${leadingPrice} cents, ${up ? "+" : ""}${pct.toFixed(1)}%`}
              >
                <div className="min-w-0">
                  <div className={TOP_MOVERS_CATEGORY_CLASS}>{cat}</div>
                  <div className={TOP_MOVERS_QUESTION_CLASS}>{m.title}</div>
                </div>
                <span className="h-7 w-[60px]" aria-hidden="true">
                  <svg
                    className="block h-full w-full"
                    viewBox="0 0 60 28"
                    preserveAspectRatio="none"
                  >
                    <path
                      d={sparklinePath(m.ticker, leadingPrice, up)}
                      stroke={sparkColor}
                      strokeWidth="1.5"
                      fill="none"
                    />
                  </svg>
                </span>
                <div className="min-w-14 text-right">
                  <div className={TOP_MOVERS_PRICE_CLASS}>{leadingPrice}¢</div>
                  <span className={deltaClass(up)}>
                    {up ? "+" : ""}
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className={TOP_MOVERS_FOOTER_CLASS}>
        <a href="/discover" className={TOP_MOVERS_FOOTER_LINK_CLASS}>
          {t("VIEW_ALL_TRENDING")} →
        </a>
      </div>
    </aside>
  );
}
