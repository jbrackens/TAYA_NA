"use client";

/**
 * MomentMarketsSection
 *
 * The approved Predict surface is a compact, three-column market board. The
 * card treatment keeps the focus on public participant views, while the
 * controls deliberately use the established practical directory model:
 * search, activity/closing/newest sorting, and a closing window. This avoids
 * inventing a second discovery taxonomy above the market grid.
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import type { PredictionMarket } from "@taptrade-ui/api-client/src/prediction-types";
import { Button, Input } from "../ui";
import { MarketGrid } from "./MarketGrid";
import { dedupeMarkets } from "./market-display";

const api = createPredictionClient();
const PAGE_SIZE = 9;
const GRID_SKELETON_IDS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
] as const;

type DateWindow = "all" | "24h" | "7d" | "30d";
type MarketSort = "activity" | "closing_soon" | "newest";

const SORT_PILLS: readonly {
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

const TIME_PILLS: readonly {
  value: DateWindow;
  labelKey?: string;
  label?: string;
}[] = [
  { value: "all", labelKey: "ALL" },
  { value: "24h", label: "1D" },
  { value: "7d", label: "1W" },
  { value: "30d", label: "1M" },
];

const FILTER_GROUP_CLASS =
  "inline-flex shrink-0 gap-1 rounded-[8px] border border-[var(--border-1)] bg-[var(--surface-2)] p-[3px] max-[640px]:max-w-full max-[640px]:overflow-x-auto max-[640px]:[scrollbar-width:none] max-[640px]:[&::-webkit-scrollbar]:hidden";

function dateWindowToCloseBefore(window: DateWindow): string | undefined {
  if (window === "all") return undefined;
  const hours = window === "24h" ? 24 : window === "7d" ? 24 * 7 : 24 * 30;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function filterPillClass(active: boolean): string {
  return `min-h-9 cursor-pointer whitespace-nowrap rounded-[6px] border-0 px-3 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] ${
    active
      ? "bg-[var(--brand-purple)] text-[var(--on-brand)]"
      : "bg-transparent text-[var(--t3)] hover:text-[var(--t1)]"
  }`;
}

function GridSkeleton() {
  return (
    <div
      className="grid auto-rows-fr grid-cols-3 items-stretch gap-5 max-[1120px]:grid-cols-2 max-[640px]:grid-cols-1 max-[640px]:gap-4"
      aria-hidden="true"
    >
      {GRID_SKELETON_IDS.map((skeletonId) => (
        <div
          key={skeletonId}
          className="h-[222px] animate-pulse rounded-[12px] border border-[var(--border-1)] bg-[var(--surface-1)] p-4"
        >
          <div className="flex items-center justify-between">
            <span className="h-6 w-20 rounded-[7px] bg-[var(--surface-2)]" />
            <span className="h-3 w-16 rounded-full bg-[var(--surface-2)]" />
          </div>
          <span className="mt-4 block h-4 w-11/12 rounded-full bg-[var(--surface-2)]" />
          <span className="mt-2 block h-4 w-3/4 rounded-full bg-[var(--surface-2)]" />
          <span className="mt-8 block h-2 w-full rounded-full bg-[var(--surface-2)]" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <span className="h-9 rounded-[7px] bg-[var(--surface-2)]" />
            <span className="h-9 rounded-[7px] bg-[var(--surface-2)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MomentMarketsSection({ categoryId }: { categoryId?: string }) {
  const { t } = useTranslation("prediction");
  const { t: headerT } = useTranslation("header");
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<MarketSort>("activity");
  const [dateWindow, setDateWindow] = useState<DateWindow>("all");
  const loadMoreRequestRef = useRef(0);

  const requestParams = useMemo(
    () => ({
      status: "open" as const,
      categoryId,
      closeBefore: dateWindowToCloseBefore(dateWindow),
      q: query.trim() || undefined,
      sort: sortBy,
    }),
    // Recalculate a selected closing window when the user retries, rather
    // than reusing a stale "next 1D / 1W / 1M" cutoff.
    [categoryId, dateWindow, query, sortBy, reloadNonce],
  );

  // A filter change starts a fresh 3×3 result set and invalidates an older
  // Load More response, so an old query cannot append into new results.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadNonce deliberately repeats the same request after a load error
  useEffect(() => {
    let cancelled = false;
    loadMoreRequestRef.current += 1;
    setLoading(true);
    setLoadingMore(false);
    setMarkets([]);
    setPage(1);
    setHasNext(false);
    setError(null);

    api
      .getMarkets({ ...requestParams, page: 1, pageSize: PAGE_SIZE })
      .then((response) => {
        if (cancelled) return;
        setMarkets(response.data || []);
        setPage(response.meta.page);
        setHasNext(response.meta.hasNext);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadNonce, requestParams]);

  function loadMore() {
    if (loadingMore || !hasNext) return;
    const requestId = loadMoreRequestRef.current + 1;
    loadMoreRequestRef.current = requestId;
    setLoadingMore(true);
    setError(null);

    api
      .getMarkets({ ...requestParams, page: page + 1, pageSize: PAGE_SIZE })
      .then((response) => {
        if (loadMoreRequestRef.current !== requestId) return;
        setMarkets((current) =>
          dedupeMarkets([...current, ...(response.data || [])]),
        );
        setPage(response.meta.page);
        setHasNext(response.meta.hasNext);
      })
      .catch((cause: unknown) => {
        if (loadMoreRequestRef.current === requestId) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      })
      .finally(() => {
        if (loadMoreRequestRef.current === requestId) {
          setLoadingMore(false);
        }
      });
  }

  const activeSort = SORT_PILLS.find((pill) => pill.value === sortBy);
  const heading =
    sortBy === "activity"
      ? t("TRENDING_MARKETS", "Trending markets")
      : t(
          activeSort?.labelKey ?? "TRENDING_MARKETS",
          activeSort?.fallback ?? "Trending markets",
        );
  const hasFilters =
    Boolean(query.trim()) || dateWindow !== "all" || sortBy !== "activity";

  return (
    <section id="trending-markets" aria-labelledby="moments-market-heading">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="type-display m-0 text-[22px] font-semibold tracking-[-0.02em] text-[var(--t1)] max-[640px]:text-[20px]">
            {t("HAPPENING_NOW", "Happening now")}
          </h2>
          <p className="mb-0 mt-1 text-[12px] leading-5 text-[var(--t3)]">
            {t(
              "HAPPENING_NOW_DESCRIPTION",
              "Moments already drawing people in today.",
            )}
          </p>
        </div>
        <Link
          href="/discover"
          className="shrink-0 text-[13px] font-semibold text-[var(--accent-text)] no-underline transition-colors hover:text-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
        >
          {t("VIEW_ALL_MOMENTS", "View all moments")}
        </Link>
      </div>

      <div
        className="mt-5 flex flex-wrap items-center gap-3 max-[640px]:items-stretch"
        data-testid="moment-filter-bar"
      >
        <Input
          type="search"
          className="min-h-10 min-w-[280px] flex-1 basis-[320px] bg-[var(--surface-1)] max-[640px]:min-w-0 max-[640px]:basis-full"
          placeholder={t(
            "SEARCH_MARKETS_PLACEHOLDER",
            headerT("SEARCH_MARKETS_PLACEHOLDER"),
          )}
          aria-label={headerT("SEARCH_MARKETS")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <fieldset className={`${FILTER_GROUP_CLASS} m-0 min-w-0`}>
          <legend className="sr-only">{t("SORT_MARKETS", "Sort markets")}</legend>
          {SORT_PILLS.map((pill) => {
            const active = sortBy === pill.value;
            return (
              <button
                key={pill.value}
                type="button"
                aria-pressed={active}
                data-testid={`market-sort-${pill.value}`}
                className={filterPillClass(active)}
                onClick={() => setSortBy(pill.value)}
              >
                {t(pill.labelKey, pill.fallback)}
              </button>
            );
          })}
        </fieldset>

        <fieldset className={`${FILTER_GROUP_CLASS} m-0 min-w-0`}>
          <legend className="sr-only">
            {t("FILTER_BY_CLOSING_WINDOW", "Filter by closing window")}
          </legend>
          {TIME_PILLS.map((pill) => {
            const active = dateWindow === pill.value;
            return (
              <button
                key={pill.value}
                type="button"
                aria-pressed={active}
                data-testid={`market-window-${pill.value}`}
                className={filterPillClass(active)}
                onClick={() => setDateWindow(pill.value)}
              >
                {pill.labelKey ? t(pill.labelKey) : pill.label}
              </button>
            );
          })}
        </fieldset>
      </div>

      <div className="mt-7 flex items-end justify-between gap-4 max-[640px]:mt-6">
        <h2
          id="moments-market-heading"
          className="type-display m-0 text-[22px] font-semibold tracking-[-0.02em] text-[var(--t1)] max-[640px]:text-[20px]"
        >
          {heading}
        </h2>
        <p className="mb-0 text-right text-[12px] leading-5 text-[var(--t3)] max-[640px]:hidden">
          {t(
            "MARKET_IMPLIED_ACTIVITY",
            "Market-implied activity · updated continuously",
          )}
        </p>
      </div>

      <div className="mt-4">
        {error && markets.length === 0 ? (
          <div
            role="alert"
            className="rounded-[12px] border border-[var(--border-1)] border-l-[3px] border-l-[var(--brand-purple)] bg-[var(--surface-1)] px-5 py-4"
          >
            <p className="m-0 text-sm font-semibold text-[var(--t1)]">
              {t("COULD_NOT_LOAD_MARKETS", "Markets could not be loaded")}
            </p>
            <p className="mb-0 mt-1 text-[13px] text-[var(--t2)]">{error}</p>
            <button
              type="button"
              onClick={() => setReloadNonce((nonce) => nonce + 1)}
              className="mt-3 min-h-10 cursor-pointer rounded-[8px] border border-[var(--border-2)] bg-[var(--surface-1)] px-4 text-[13px] font-semibold text-[var(--accent-text)] transition-colors hover:border-[var(--brand-purple)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]"
            >
              {t("RETRY", "Retry")}
            </button>
          </div>
        ) : loading && markets.length === 0 ? (
          <GridSkeleton />
        ) : markets.length > 0 ? (
          <MarketGrid markets={markets} columns={3} />
        ) : (
          <div className="rounded-[12px] border border-dashed border-[var(--border-2)] bg-[var(--surface-1)] px-5 py-10 text-center">
            <p className="m-0 text-sm font-semibold text-[var(--t1)]">
              {t("NO_FILTER_MATCH", "No markets match those filters")}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSortBy("activity");
                  setDateWindow("all");
                }}
                className="mt-3 min-h-10 cursor-pointer rounded-[8px] border border-[var(--border-2)] bg-[var(--surface-1)] px-4 text-[13px] font-semibold text-[var(--accent-text)] transition-colors hover:border-[var(--brand-purple)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]"
              >
                {t("CLEAR_FILTERS", "Clear filters")}
              </button>
            )}
          </div>
        )}
      </div>

      {error && markets.length > 0 && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[var(--border-1)] border-l-[3px] border-l-[var(--brand-purple)] bg-[var(--surface-1)] px-4 py-3"
        >
          <p className="m-0 text-[13px] text-[var(--t2)]">
            {t(
              "COULD_NOT_LOAD_MORE_MARKETS",
              "The next batch could not be loaded. Try again.",
            )}
          </p>
          <button
            type="button"
            onClick={loadMore}
            className="min-h-9 cursor-pointer rounded-[7px] border border-[var(--border-2)] bg-[var(--surface-1)] px-3 text-[13px] font-semibold text-[var(--accent-text)] transition-colors hover:border-[var(--brand-purple)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]"
          >
            {t("RETRY", "Retry")}
          </button>
        </div>
      )}

      {hasNext && (
        <div className="mt-6 flex justify-center">
          <Button
            size="none"
            className="min-h-11 rounded-[8px] border-[var(--brand-purple)] bg-[var(--brand-purple)] px-6 text-sm font-semibold text-[var(--on-brand)] hover:border-[var(--brand-dark)] hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:border-[var(--inert-border)] disabled:bg-[var(--inert-fill)] disabled:text-[var(--inert-label)]"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore
              ? t("LOADING", "Loading…")
              : t("LOAD_MORE_MARKETS", "Load More Markets")}
          </Button>
        </div>
      )}
    </section>
  );
}
