"use client";

/**
 * AllMarketsSection — paginated grid of open prediction markets, owning
 * its own filter state. The section header is a single row of pills:
 * category pills (All / Politics / Crypto / ...) on the left, closing-
 * window pills (All / 1D / 1W / 1M) on the right. No title — the layout
 * is self-evident.
 *
 * Both filters scope only this section (NOT the hero, Top Movers, or
 * Featured). They compose: pick "Politics" + "1D" = political markets
 * closing within 24h.
 *
 * Pagination is "Load more" rather than infinite scroll: trading users
 * scan price columns, and infinite scroll plays badly with that pattern.
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MarketGrid } from "./MarketGrid";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import { categoryName } from "./market-content";
import {
  extractMarketSubcategories,
  marketMatchesSubcategory,
} from "./marketSubcategories";
import type {
  Category,
  PredictionMarket,
} from "@phoenix-ui/api-client/src/prediction-types";

const api = createPredictionClient();

const PAGE_SIZE = 12;

type DateWindow = "all" | "24h" | "7d" | "30d";

const TIME_PILLS: { value: DateWindow; labelKey?: string; label?: string }[] = [
  { value: "all", labelKey: "ALL" },
  { value: "24h", label: "1D" },
  { value: "7d", label: "1W" },
  { value: "30d", label: "1M" },
];

const FILTER_HEAD_CLASS =
  "mt-8 mb-[18px] flex flex-wrap items-center justify-between gap-4 font-['Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif] max-[768px]:mt-6 max-[768px]:mb-4 max-[768px]:flex-col max-[768px]:flex-nowrap max-[768px]:items-stretch max-[768px]:justify-start max-[768px]:gap-2.5";

const CATEGORY_LIST_CLASS =
  "flex min-w-0 flex-1 flex-wrap gap-2 max-[768px]:mx-[-16px] max-[768px]:w-[calc(100%+32px)] max-[768px]:flex-[0_0_auto] max-[768px]:flex-row max-[768px]:flex-nowrap max-[768px]:overflow-x-auto max-[768px]:overflow-y-hidden max-[768px]:whitespace-nowrap max-[768px]:px-4 max-[768px]:pt-0 max-[768px]:pb-0.5 max-[768px]:[scrollbar-width:none] max-[768px]:[-ms-overflow-style:none] max-[768px]:[-webkit-overflow-scrolling:touch] max-[768px]:[&::-webkit-scrollbar]:hidden";

const CATEGORY_PILL_BASE_CLASS =
  "cursor-pointer appearance-none rounded-md border-0 px-[18px] py-[9px] [font-family:inherit] text-[13px] transition-colors duration-[120ms] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--accent-soft)] max-[768px]:flex-[0_0_auto] max-[768px]:whitespace-nowrap max-[768px]:px-4";

const TIME_PILLS_CLASS =
  "inline-flex shrink-0 gap-1 rounded-md border border-[var(--border-1)] bg-white/[0.04] p-[3px] max-[768px]:max-w-full max-[768px]:self-start max-[768px]:overflow-x-auto max-[768px]:[scrollbar-width:none] max-[768px]:[-ms-overflow-style:none] max-[768px]:[-webkit-overflow-scrolling:touch] max-[768px]:[&::-webkit-scrollbar]:hidden";

const TIME_PILL_BASE_CLASS =
  "min-w-11 cursor-pointer appearance-none rounded-md border-0 px-[14px] py-1.5 [font-family:inherit] text-xs font-semibold transition-colors duration-[120ms] max-[768px]:flex-[0_0_auto] max-[768px]:whitespace-nowrap";

const LOAD_MORE_CLASS = "mt-6 mb-0 flex justify-center";

const LOAD_MORE_BUTTON_CLASS =
  "cursor-pointer appearance-none rounded-[var(--r-pill)] border border-[var(--border-1)] bg-[var(--surface-1)] px-7 py-3 font-['Inter',_sans-serif] text-sm font-semibold text-[var(--t1)] transition-colors duration-[120ms] [&:not(:disabled):hover]:border-[rgba(43,228,128,0.5)] [&:not(:disabled):hover]:bg-[var(--surface-2)] [&:not(:disabled):hover]:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55]";

const FEED_WITH_SUBNAV_CLASS =
  "grid grid-cols-4 items-start gap-4 max-[1120px]:grid-cols-1";
const FEED_MARKETS_CLASS = "col-span-3 min-w-0 max-[1120px]:col-span-1";
const SUBNAV_CLASS =
  "sticky top-4 self-start border-l border-[var(--border-1)] pl-4 max-[1120px]:order-first max-[1120px]:sticky max-[1120px]:top-0 max-[1120px]:border-b max-[1120px]:border-l-0 max-[1120px]:pb-3 max-[1120px]:pl-0";
const SUBNAV_LABEL_CLASS =
  "mb-3 font-['IBM_Plex_Mono',_monospace] text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--t3)]";
const SUBNAV_LIST_CLASS =
  "flex flex-col items-stretch gap-1 max-[1120px]:flex-row max-[1120px]:overflow-x-auto max-[1120px]:[scrollbar-width:none] max-[1120px]:[-ms-overflow-style:none] max-[1120px]:[-webkit-overflow-scrolling:touch] max-[1120px]:[&::-webkit-scrollbar]:hidden";
const SUBNAV_BUTTON_BASE_CLASS =
  "cursor-pointer appearance-none rounded-md border-0 px-3 py-2 text-left [font-family:inherit] text-[13px] transition-colors duration-[120ms] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--accent-soft)] max-[1120px]:flex-[0_0_auto]";

const EMPTY_CLASS =
  "rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-14 text-center";

const EMPTY_TITLE_CLASS = "m-0 text-[18px] font-bold text-[var(--t1)]";
const EMPTY_TEXT_CLASS = "mt-2 mb-0 text-[13px] text-[var(--t3)]";

function categoryPillClass(active: boolean): string {
  return `${CATEGORY_PILL_BASE_CLASS} ${
    active
      ? "bg-[var(--yes)] font-semibold text-[#061a10]"
      : "bg-white/[0.05] font-medium text-[var(--t2)] hover:bg-white/[0.08] hover:text-[var(--t1)]"
  }`;
}

function timePillClass(active: boolean): string {
  return `${TIME_PILL_BASE_CLASS} ${
    active
      ? "bg-[var(--yes)] text-[#061a10]"
      : "bg-transparent text-[var(--t3)] hover:text-[var(--t1)]"
  }`;
}

function subcategoryButtonClass(active: boolean): string {
  return `${SUBNAV_BUTTON_BASE_CLASS} ${
    active
      ? "bg-[var(--yes)] font-semibold text-[#061a10]"
      : "bg-transparent font-medium text-[var(--t2)] hover:bg-white/[0.06] hover:text-[var(--t1)]"
  }`;
}

function dateWindowToCloseBefore(w: DateWindow): string | undefined {
  if (w === "all") return undefined;
  const ms = w === "24h" ? 24 : w === "7d" ? 24 * 7 : 24 * 30;
  return new Date(Date.now() + ms * 60 * 60 * 1000).toISOString();
}

interface Props {
  categories: Category[];
}

export function AllMarketsSection({ categories }: Props) {
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categorySlug, setCategorySlug] = useState<string>("all");
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [dateWindow, setDateWindow] = useState<DateWindow>("all");

  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const categoryId = activeCategory?.id;
  const activeCategoryLabel = activeCategory
    ? categoryName(contentT, activeCategory)
    : categorySlug;
  const showSubnavCategory =
    categorySlug !== "all" && categorySlug !== "general";
  const subcategories = useMemo(
    () =>
      showSubnavCategory
        ? extractMarketSubcategories(markets, activeCategory ?? categorySlug)
        : [],
    [activeCategory, categorySlug, markets, showSubnavCategory],
  );
  const visibleMarkets = useMemo(
    () =>
      subcategory
        ? markets.filter((market) =>
            marketMatchesSubcategory(
              market,
              subcategory,
              activeCategory ?? categorySlug,
            ),
          )
        : markets,
    [activeCategory, categorySlug, markets, subcategory],
  );
  const hasSecondaryNav = showSubnavCategory && subcategories.length > 0;

  useEffect(() => {
    setSubcategory(null);
  }, [categorySlug, dateWindow]);

  useEffect(() => {
    if (subcategory && !subcategories.includes(subcategory)) {
      setSubcategory(null);
    }
  }, [subcategory, subcategories]);

  // Initial load + refetch when either filter changes.
  // closeBefore is computed inside the effect (NOT outside) because it
  // calls Date.now(); recomputing it on every render would produce a new
  // ISO string each time and trigger an infinite re-fetch loop.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMarkets([]);
    setPage(1);
    api
      .getMarkets({
        status: "open",
        page: 1,
        pageSize: PAGE_SIZE,
        categoryId,
        closeBefore: dateWindowToCloseBefore(dateWindow),
      })
      .then((res) => {
        if (cancelled) return;
        setMarkets(res.data || []);
        setPage(res.meta.page);
        setHasNext(res.meta.hasNext);
        setError(null);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (!cancelled) setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId, dateWindow]);

  function loadMore() {
    if (loadingMore || !hasNext) return;
    setLoadingMore(true);
    api
      .getMarkets({
        status: "open",
        page: page + 1,
        pageSize: PAGE_SIZE,
        categoryId,
        closeBefore: dateWindowToCloseBefore(dateWindow),
      })
      .then((res) => {
        setMarkets((prev) => [...prev, ...(res.data || [])]);
        setPage(res.meta.page);
        setHasNext(res.meta.hasNext);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      })
      .finally(() => {
        setLoadingMore(false);
      });
  }

  const filtered =
    categorySlug !== "all" || dateWindow !== "all" || subcategory !== null;
  const emptyState = (
    <div className={EMPTY_CLASS}>
      <h3 className={EMPTY_TITLE_CLASS}>
        {filtered ? t("NO_FILTER_MATCH") : t("NO_OPEN_MARKETS")}
      </h3>
      <p className={EMPTY_TEXT_CLASS}>
        {filtered ? t("TRY_DIFFERENT_FILTER") : t("CHECK_BACK_SOON")}
      </p>
    </div>
  );

  return (
    <>
      <header className={FILTER_HEAD_CLASS}>
        <nav
          className={CATEGORY_LIST_CLASS}
          role="tablist"
          aria-label={t("FILTER_BY_CATEGORY")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={categorySlug === "all"}
            className={categoryPillClass(categorySlug === "all")}
            onClick={() => {
              setCategorySlug("all");
              setSubcategory(null);
            }}
          >
            {t("ALL")}
          </button>
          {categories.map((c) => {
            const isActive = categorySlug === c.slug;
            return (
              <button
                key={c.slug}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={categoryPillClass(isActive)}
                onClick={() => {
                  setCategorySlug(c.slug);
                  setSubcategory(null);
                }}
              >
                {categoryName(contentT, c)}
              </button>
            );
          })}
        </nav>
        <div
          className={TIME_PILLS_CLASS}
          role="tablist"
          aria-label={t("FILTER_BY_CLOSING_WINDOW")}
        >
          {TIME_PILLS.map((pill) => {
            const isActive = dateWindow === pill.value;
            return (
              <button
                key={pill.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={timePillClass(isActive)}
                onClick={() => setDateWindow(pill.value)}
              >
                {pill.labelKey ? t(pill.labelKey) : pill.label}
              </button>
            );
          })}
        </div>
      </header>

      {loading && markets.length === 0 ? (
        <div className="p-14 text-center text-[13px] text-[var(--t3)]">
          {t("LOADING_MARKETS")}
        </div>
      ) : error && markets.length === 0 ? (
        <div className={EMPTY_CLASS}>
          <p className="m-0 text-[13px] text-[var(--t2)]">
            {t("COULD_NOT_LOAD_MARKETS")} {error}
          </p>
        </div>
      ) : !loading && markets.length === 0 ? (
        emptyState
      ) : (
        <>
          {hasSecondaryNav ? (
            <div className={FEED_WITH_SUBNAV_CLASS}>
              <div className={FEED_MARKETS_CLASS}>
                {visibleMarkets.length > 0 ? (
                  <MarketGrid markets={visibleMarkets} columns={3} />
                ) : (
                  emptyState
                )}
              </div>
              <aside className={SUBNAV_CLASS} aria-label={activeCategoryLabel}>
                <div className={SUBNAV_LABEL_CLASS}>{activeCategoryLabel}</div>
                <nav className={SUBNAV_LIST_CLASS} role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={subcategory === null}
                    className={subcategoryButtonClass(subcategory === null)}
                    onClick={() => setSubcategory(null)}
                  >
                    {t("ALL")}
                  </button>
                  {subcategories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="tab"
                      aria-selected={subcategory === item}
                      className={subcategoryButtonClass(subcategory === item)}
                      onClick={() => setSubcategory(item)}
                    >
                      {item}
                    </button>
                  ))}
                </nav>
              </aside>
            </div>
          ) : (
            visibleMarkets.length > 0 ? (
              <MarketGrid markets={visibleMarkets} columns={4} />
            ) : (
              emptyState
            )
          )}
          {hasNext && (
            <div className={LOAD_MORE_CLASS}>
              <button
                type="button"
                className={LOAD_MORE_BUTTON_CLASS}
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? t("LOADING") : t("LOAD_MORE_MARKETS")}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
