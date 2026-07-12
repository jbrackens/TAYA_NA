"use client";

/**
 * AllMarketsSection — paginated grid of open prediction markets, owning
 * its own filter state. P11: the browse desk — an "ALL MARKETS" rubric on
 * a heavy ink rule, editorial text-tab filters (category, sort, watchlist,
 * closing window), a square wire search input, and mono taxonomy links.
 *
 * Both filters scope only this section (NOT the hero, Top Movers, or
 * Featured). They compose: pick "Politics" + "1D" = political markets
 * closing within 24h.
 *
 * Pagination is "Load more" rather than infinite scroll: trading users
 * scan price columns, and infinite scroll plays badly with that pattern.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { MarketGrid } from "./MarketGrid";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import {
  addMarketToWatchlist,
  getMarketWatchlist,
  removeMarketFromWatchlist,
} from "../../lib/api/market-watchlist-client";
import { categoryName } from "./market-content";
import {
  extractMarketSubcategories,
  marketMatchesSubcategory,
} from "./marketSubcategories";
import type {
  Category,
  PredictionMarket,
  Series,
} from "@taptrade-ui/api-client/src/prediction-types";

const api = createPredictionClient();

const PAGE_SIZE = 12;
const SUBCATEGORY_CORPUS_SIZE = 120;

type DateWindow = "all" | "24h" | "7d" | "30d";
type MarketSort = "activity" | "closing_soon" | "newest";

const SORT_PILLS: {
  value: MarketSort;
  labelKey: string;
  fallback: string;
}[] = [
  { value: "activity", labelKey: "SORT_ACTIVITY", fallback: "Trending" },
  {
    value: "closing_soon",
    labelKey: "SORT_CLOSING_SOON",
    fallback: "Closing soon",
  },
  { value: "newest", labelKey: "SORT_NEWEST", fallback: "Newest" },
];

const CATEGORY_ORDER = [
  "entertainment",
  "politics",
  "sports",
  "tech",
  "economics",
  "general",
] as const;

const TIME_PILLS: { value: DateWindow; labelKey?: string; label?: string }[] = [
  { value: "all", labelKey: "ALL" },
  { value: "24h", label: "1D" },
  { value: "7d", label: "1W" },
  { value: "30d", label: "1M" },
];

// P11 "Standing Question": the browse desk. A rubric on a heavy ink rule
// heads the section; every control is editorial text furniture — small-caps
// text tabs with an ink underline for the active state, a square wire
// search input, plain mono taxonomy links. No pills, no fills, no rounding.
const SECTION_HEAD_CLASS =
  "mt-10 border-t-[3px] border-[var(--rule-ink)] pt-2 max-[768px]:mt-8";
const SECTION_TITLE_CLASS =
  "m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--t1)]";

const FILTER_HEAD_CLASS =
  "mt-3 mb-[18px] flex flex-wrap items-center justify-between gap-4 font-['Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif] max-[768px]:mb-4 max-[768px]:flex-col max-[768px]:flex-nowrap max-[768px]:items-stretch max-[768px]:justify-start max-[768px]:gap-2.5";

const CATEGORY_LIST_CLASS =
  "flex items-center gap-6 border-b border-[var(--border-1)] w-full max-[768px]:mx-[-16px] max-[768px]:w-[calc(100%+32px)] max-[768px]:flex-[0_0_auto] max-[768px]:flex-row max-[768px]:flex-nowrap max-[768px]:overflow-x-auto max-[768px]:overflow-y-hidden max-[768px]:whitespace-nowrap max-[768px]:px-4 max-[768px]:[scrollbar-width:none] max-[768px]:[-ms-overflow-style:none] max-[768px]:[-webkit-overflow-scrolling:touch] max-[768px]:[&::-webkit-scrollbar]:hidden";

const CATEGORY_PILL_BASE_CLASS =
  "relative cursor-pointer appearance-none bg-transparent pb-3 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] border-0 border-b-2 transition-colors duration-150 [font-family:inherit] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--accent-soft)] max-[768px]:flex-[0_0_auto] max-[768px]:whitespace-nowrap";

const TIME_PILLS_CLASS =
  "inline-flex shrink-0 items-baseline gap-4 max-[768px]:max-w-full max-[768px]:self-start max-[768px]:overflow-x-auto max-[768px]:[scrollbar-width:none] max-[768px]:[-ms-overflow-style:none] max-[768px]:[-webkit-overflow-scrolling:touch] max-[768px]:[&::-webkit-scrollbar]:hidden";

const TIME_PILL_BASE_CLASS =
  "cursor-pointer appearance-none bg-transparent border-0 border-b-2 px-0.5 pb-1.5 pt-1 [font-family:inherit] text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-[120ms] max-[768px]:flex-[0_0_auto] max-[768px]:whitespace-nowrap";

const DISCOVERY_CONTROLS_CLASS =
  "flex w-full flex-wrap items-center justify-between gap-x-5 gap-y-3 max-[768px]:items-stretch";
const SEARCH_INPUT_CLASS =
  "min-h-10 min-w-[260px] flex-1 border border-[var(--border-2)] bg-[var(--surface-2)] px-3 font-mono text-[13px] text-[var(--t1)] outline-none transition-colors duration-[120ms] [font-variant-numeric:tabular-nums] placeholder:text-[var(--t4)] focus:border-[var(--focus-ring)] max-[768px]:min-w-0";
const WATCHLIST_FILTER_CLASS =
  "min-h-10 cursor-pointer appearance-none bg-transparent border-0 border-b-2 px-0.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-[120ms]";
const TAXONOMY_PANEL_CLASS = "grid w-full gap-2.5";
const TAXONOMY_GROUP_CLASS = "flex flex-wrap items-baseline gap-x-3 gap-y-2";
const TAXONOMY_LABEL_CLASS =
  "shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--t3)]";
const TAXONOMY_LIST_CLASS = "flex flex-wrap items-baseline gap-x-4 gap-y-1.5";
const TAXONOMY_LINK_CLASS =
  "font-mono text-[12px] font-medium text-[var(--t2)] no-underline underline-offset-2 transition-colors hover:text-[var(--accent-text)] hover:underline";
const TAG_BUTTON_BASE_CLASS =
  "cursor-pointer appearance-none border-0 bg-transparent p-0 font-mono text-[12px] font-medium underline-offset-2 transition-colors";

const LOAD_MORE_CLASS = "mt-8 mb-0 flex justify-center";

const LOAD_MORE_BUTTON_CLASS =
  "cursor-pointer appearance-none border border-[var(--border-2)] bg-transparent px-8 py-3 font-['Inter',_sans-serif] text-[13px] font-semibold text-[var(--t1)] transition-colors duration-[120ms] [&:not(:disabled):hover]:bg-[var(--action-soft)] disabled:cursor-not-allowed disabled:opacity-[0.55]";

const FEED_WITH_SUBNAV_CLASS =
  "grid grid-cols-4 items-start gap-6 max-[1120px]:grid-cols-1 max-[1120px]:gap-4";
const FEED_MARKETS_CLASS = "col-span-3 min-w-0 max-[1120px]:col-span-1";
const SUBNAV_CLASS =
  "sticky top-4 self-start border-l border-[var(--border-1)] pl-4 max-[1120px]:order-first max-[1120px]:sticky max-[1120px]:top-0 max-[1120px]:border-b max-[1120px]:border-l-0 max-[1120px]:pb-3 max-[1120px]:pl-0";
const SUBNAV_LABEL_CLASS =
  "mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--t3)]";
const SUBNAV_LIST_CLASS =
  "flex flex-col items-stretch gap-1 max-[1120px]:flex-row max-[1120px]:gap-4 max-[1120px]:overflow-x-auto max-[1120px]:[scrollbar-width:none] max-[1120px]:[-ms-overflow-style:none] max-[1120px]:[-webkit-overflow-scrolling:touch] max-[1120px]:[&::-webkit-scrollbar]:hidden";
const SUBNAV_BUTTON_BASE_CLASS =
  "cursor-pointer appearance-none border-0 bg-transparent px-0 py-2 text-left [font-family:inherit] text-[13px] transition-colors duration-[120ms] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--accent-soft)] max-[1120px]:flex-[0_0_auto] max-[1120px]:whitespace-nowrap";

const EMPTY_CLASS = "border border-[var(--border-1)] p-14 text-center";

const EMPTY_TITLE_CLASS =
  "type-display m-0 text-[18px] font-medium text-[var(--t1)]";
const EMPTY_TEXT_CLASS = "mt-2 mb-0 text-[13px] text-[var(--t3)]";

function categoryPillClass(active: boolean): string {
  return `${CATEGORY_PILL_BASE_CLASS} ${
    active
      ? "text-[var(--t1)] border-[var(--rule-ink)]"
      : "text-[var(--t3)] border-transparent hover:text-[var(--t1)]"
  }`;
}

function timePillClass(active: boolean): string {
  return `${TIME_PILL_BASE_CLASS} ${
    active
      ? "text-[var(--t1)] border-[var(--rule-ink)]"
      : "text-[var(--t3)] border-transparent hover:text-[var(--t1)]"
  }`;
}

function subcategoryButtonClass(active: boolean): string {
  return `${SUBNAV_BUTTON_BASE_CLASS} ${
    active
      ? "font-semibold text-[var(--t1)] underline underline-offset-4"
      : "font-medium text-[var(--t2)] hover:text-[var(--t1)]"
  }`;
}

function tagButtonClass(active: boolean): string {
  return `${TAG_BUTTON_BASE_CLASS} ${
    active
      ? "text-[var(--accent-text)] underline"
      : "text-[var(--t2)] hover:text-[var(--accent-text)] hover:underline"
  }`;
}

function dateWindowToCloseBefore(w: DateWindow): string | undefined {
  if (w === "all") return undefined;
  const ms = w === "24h" ? 24 : w === "7d" ? 24 * 7 : 24 * 30;
  return new Date(Date.now() + ms * 60 * 60 * 1000).toISOString();
}

function mergeMarkets(
  current: PredictionMarket[],
  next: PredictionMarket[],
): PredictionMarket[] {
  const seen = new Set(current.map((market) => market.id));
  const merged = [...current];
  for (const market of next) {
    if (seen.has(market.id)) continue;
    seen.add(market.id);
    merged.push(market);
  }
  return merged;
}

function orderCategories(categories: Category[]): Category[] {
  const rank = new Map<string, number>(
    CATEGORY_ORDER.map((slug, index) => [slug, index]),
  );
  return categories
    .filter((category) => category.slug.toLowerCase() !== "crypto")
    .sort((a, b) => {
      const aRank = rank.get(a.slug.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
      const bRank = rank.get(b.slug.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      return categories.indexOf(a) - categories.indexOf(b);
    });
}

interface Props {
  categories: Category[];
}

export function AllMarketsSection({ categories }: Props) {
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [subcategoryCorpus, setSubcategoryCorpus] = useState<
    PredictionMarket[]
  >([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categorySlug, setCategorySlug] = useState<string>("all");
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [dateWindow, setDateWindow] = useState<DateWindow>("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<MarketSort>("activity");
  const [watchedMarketIds, setWatchedMarketIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const orderedCategories = useMemo(
    () => orderCategories(categories),
    [categories],
  );

  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const categoryId = activeCategory?.id;
  const activeCategoryLabel = activeCategory
    ? categoryName(contentT, activeCategory)
    : categorySlug;
  const showSubnavCategory =
    categorySlug !== "all" && categorySlug !== "general";
  const subcategorySource =
    subcategoryCorpus.length > 0 ? subcategoryCorpus : markets;
  const subcategories = useMemo(
    () =>
      showSubnavCategory
        ? extractMarketSubcategories(
            subcategorySource,
            activeCategory ?? categorySlug,
          )
        : [],
    [activeCategory, categorySlug, showSubnavCategory, subcategorySource],
  );
  const visibleSeries = series.slice(0, 8);
  const visibleTags = tags.slice(0, 12);
  const visibleMarkets = useMemo(() => {
    const base = subcategory
      ? subcategorySource.filter((market) =>
          marketMatchesSubcategory(
            market,
            subcategory,
            activeCategory ?? categorySlug,
          ),
        )
      : markets;
    return showWatchlistOnly
      ? base.filter((market) => watchedMarketIds.has(market.id))
      : base;
  }, [
    activeCategory,
    categorySlug,
    markets,
    showWatchlistOnly,
    subcategory,
    subcategorySource,
    watchedMarketIds,
  ]);
  const hasSecondaryNav = showSubnavCategory && subcategories.length > 0;

  useEffect(() => {
    let cancelled = false;
    getMarketWatchlist()
      .then((ids) => {
        if (!cancelled) setWatchedMarketIds(new Set(ids));
      })
      .catch(() => {
        if (!cancelled) setWatchedMarketIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSubcategory(null);
    setSelectedTag(null);
  }, [categorySlug, dateWindow]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getSeries({ categoryId }).catch(() => [] as Series[]),
      api.getTags({ categoryId }).catch(() => [] as string[]),
    ]).then(([nextSeries, nextTags]) => {
      if (cancelled) return;
      setSeries(nextSeries);
      setTags(nextTags);
    });
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  useEffect(() => {
    if (subcategory && !subcategories.includes(subcategory)) {
      setSubcategory(null);
    }
  }, [subcategory, subcategories]);

  useEffect(() => {
    if (selectedTag && tags.length > 0 && !tags.includes(selectedTag)) {
      setSelectedTag(null);
    }
  }, [selectedTag, tags]);

  // Initial load + refetch when either filter changes.
  // closeBefore is computed inside the effect (NOT outside) because it
  // calls Date.now(); recomputing it on every render would produce a new
  // ISO string each time and trigger an infinite re-fetch loop.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMarkets([]);
    setSubcategoryCorpus([]);
    setPage(1);
    const search = query.trim();
    const baseParams = {
      status: "open",
      categoryId,
      closeBefore: dateWindowToCloseBefore(dateWindow),
      q: search || undefined,
      tag: selectedTag || undefined,
      sort: sortBy,
    };
    const pageRequest = api.getMarkets({
      ...baseParams,
      page: 1,
      pageSize: PAGE_SIZE,
    });
    const corpusRequest = showSubnavCategory
      ? api
          .getMarkets({
            ...baseParams,
            page: 1,
            pageSize: SUBCATEGORY_CORPUS_SIZE,
          })
          .catch(() => null)
      : Promise.resolve(null);

    Promise.all([pageRequest, corpusRequest])
      .then(([res, corpusRes]) => {
        if (cancelled) return;
        setMarkets(res.data || []);
        setSubcategoryCorpus(corpusRes?.data || res.data || []);
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
  }, [
    categoryId,
    categorySlug,
    dateWindow,
    query,
    selectedTag,
    showSubnavCategory,
    sortBy,
  ]);

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
        q: query.trim() || undefined,
        tag: selectedTag || undefined,
        sort: sortBy,
      })
      .then((res) => {
        const next = res.data || [];
        setMarkets((prev) => [...prev, ...next]);
        setSubcategoryCorpus((prev) => mergeMarkets(prev, next));
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

  function toggleWatchlist(marketId: string) {
    const currentlyWatched = watchedMarketIds.has(marketId);
    setWatchedMarketIds((prev) => {
      const next = new Set(prev);
      if (currentlyWatched) {
        next.delete(marketId);
      } else {
        next.add(marketId);
      }
      return next;
    });
    const request = currentlyWatched
      ? removeMarketFromWatchlist(marketId)
      : addMarketToWatchlist(marketId);
    request.catch((err: unknown) => {
      setWatchedMarketIds((prev) => {
        const next = new Set(prev);
        if (currentlyWatched) {
          next.add(marketId);
        } else {
          next.delete(marketId);
        }
        return next;
      });
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    });
  }

  const filtered =
    categorySlug !== "all" ||
    dateWindow !== "all" ||
    subcategory !== null ||
    selectedTag !== null ||
    query.trim() !== "" ||
    showWatchlistOnly;
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
      <div className={SECTION_HEAD_CLASS}>
        <h2 className={SECTION_TITLE_CLASS}>
          {t("ALL_MARKETS", "All markets")}
        </h2>
      </div>
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
          {orderedCategories.map((c) => {
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
        <div className={DISCOVERY_CONTROLS_CLASS}>
          <input
            type="search"
            className={SEARCH_INPUT_CLASS}
            placeholder={t("SEARCH_MARKETS_PLACEHOLDER")}
            aria-label={t("SEARCH_MARKETS")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div
            className={TIME_PILLS_CLASS}
            role="tablist"
            aria-label={t("SORT_MARKETS", "Sort markets")}
          >
            {SORT_PILLS.map((pill) => {
              const isActive = sortBy === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={timePillClass(isActive)}
                  onClick={() => setSortBy(pill.value)}
                >
                  {t(pill.labelKey, pill.fallback)}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={`${WATCHLIST_FILTER_CLASS} ${
              showWatchlistOnly
                ? "border-[var(--rule-ink)] text-[var(--t1)]"
                : "border-transparent text-[var(--t3)] hover:text-[var(--t1)]"
            }`}
            aria-pressed={showWatchlistOnly}
            onClick={() => setShowWatchlistOnly((value) => !value)}
          >
            {t("WATCHLIST", "Watchlist")}
          </button>
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
        </div>
        {(visibleSeries.length > 0 || visibleTags.length > 0) && (
          <div className={TAXONOMY_PANEL_CLASS}>
            {visibleSeries.length > 0 && (
              <section className={TAXONOMY_GROUP_CLASS}>
                <div className={TAXONOMY_LABEL_CLASS}>
                  {t("SERIES", "Series")}
                </div>
                <div className={TAXONOMY_LIST_CLASS}>
                  {visibleSeries.map((item) => (
                    <Link
                      key={item.id}
                      className={TAXONOMY_LINK_CLASS}
                      href={`/series/${item.slug}`}
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {visibleTags.length > 0 && (
              <section className={TAXONOMY_GROUP_CLASS}>
                <div className={TAXONOMY_LABEL_CLASS}>{t("TAGS", "Tags")}</div>
                <div className={TAXONOMY_LIST_CLASS}>
                  {selectedTag && (
                    <button
                      type="button"
                      className={tagButtonClass(false)}
                      onClick={() => setSelectedTag(null)}
                    >
                      {t("ALL")}
                    </button>
                  )}
                  {visibleTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={selectedTag === tag}
                      className={tagButtonClass(selectedTag === tag)}
                      onClick={() =>
                        setSelectedTag((current) =>
                          current === tag ? null : tag,
                        )
                      }
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
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
                  <MarketGrid
                    markets={visibleMarkets}
                    columns={3}
                    watchedMarketIds={watchedMarketIds}
                    onToggleWatchlist={toggleWatchlist}
                  />
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
          ) : visibleMarkets.length > 0 ? (
            <MarketGrid
              markets={visibleMarkets}
              columns={4}
              watchedMarketIds={watchedMarketIds}
              onToggleWatchlist={toggleWatchlist}
            />
          ) : (
            emptyState
          )}
          {hasNext && subcategory === null && (
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
