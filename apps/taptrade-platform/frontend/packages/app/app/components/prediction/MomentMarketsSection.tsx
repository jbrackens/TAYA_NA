"use client";

/**
 * MomentMarketsSection
 *
 * The approved Predict surface is a compact, three-column moment board:
 * a visitor can scan nine markets at once, switch an in-place ranking, and
 * reveal another batch without being sent into a long single-column feed.
 *
 * The default Trending tab remains server-paginated by the gateway's real
 * activity ordering. The other tabs reuse the existing Discover ranking
 * rules, which are intentionally based on real volume, comment, price, and
 * one-day price-history fields rather than invented social-sentiment data.
 */

import Link from "next/link";
import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import type {
  DiscoveryResponse,
  PredictionMarket,
} from "@taptrade-ui/api-client/src/prediction-types";
import { Button } from "../ui";
import {
  buildDiscoverRankings,
  DISCOVER_RANKING_SECTIONS,
  marketKey,
  type DiscoverRankingKey,
} from "./discover-rankings";
import { MarketGrid } from "./MarketGrid";
import { dedupeMarkets } from "./market-display";
import {
  movementFromHistory,
  type MarketMovement,
} from "./market-movement";

const api = createPredictionClient();
const PAGE_SIZE = 9;
const RANKING_CATALOG_SIZE = 100;
const HISTORY_FETCH_CONCURRENCY = 4;
type LoadMoreError = {
  key: "trending";
  message: string;
};
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

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await fn(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
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

function EmptyRanking({ message }: { message: string }) {
  return (
    <div className="rounded-[12px] border border-dashed border-[var(--border-2)] bg-[var(--surface-1)] px-5 py-10 text-center">
      <p className="m-0 text-sm font-semibold text-[var(--t1)]">{message}</p>
    </div>
  );
}

export function MomentMarketsSection({
  discovery,
  categoryId,
}: {
  discovery: DiscoveryResponse;
  categoryId?: string;
}) {
  const { t } = useTranslation("prediction");
  const [activeKey, setActiveKey] = useState<DiscoverRankingKey>("trending");
  const [trendingMarkets, setTrendingMarkets] = useState<PredictionMarket[]>(
    [],
  );
  const [trendingPage, setTrendingPage] = useState(1);
  const [trendingHasNext, setTrendingHasNext] = useState(false);
  const [rankingCatalog, setRankingCatalog] = useState<PredictionMarket[]>(
    [],
  );
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [loadingMoreKey, setLoadingMoreKey] =
    useState<DiscoverRankingKey | null>(null);
  const [loadMoreError, setLoadMoreError] =
    useState<LoadMoreError | null>(null);
  const [rankingDisplayCount, setRankingDisplayCount] = useState(PAGE_SIZE);
  const [movements, setMovements] = useState<
    Record<string, MarketMovement | null>
  >({});
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementError, setMovementError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const completedMovementCorpusRef = useRef<string>("");
  const loadMoreRequestRef = useRef(0);

  const activeSection =
    DISCOVER_RANKING_SECTIONS.find((section) => section.key === activeKey) ??
    DISCOVER_RANKING_SECTIONS[0];
  const usesMovement = activeKey === "gainers" || activeKey === "decliners";

  // Explore-topic links change the same board in place. Reset the bounded
  // catalog and invalidate an outstanding append before accepting data for
  // the next topic, so an old topic can never bleed into the new one.
  // biome-ignore lint/correctness/useExhaustiveDependencies: categoryId is the deliberate topic-reset signal
  useEffect(() => {
    loadMoreRequestRef.current += 1;
    completedMovementCorpusRef.current = "";
    setTrendingMarkets([]);
    setTrendingPage(1);
    setTrendingHasNext(false);
    setRankingCatalog([]);
    setRankingDisplayCount(PAGE_SIZE);
    setMovements({});
    setMovementError(null);
    setLoadMoreError(null);
    setLoadingMoreKey(null);
    setError(null);
  }, [categoryId]);

  // Trending must preserve true server pagination: initial and follow-up
  // requests are nine cards each, which is the 3×3 desktop contract. A
  // minute refresh keeps the public activity ranking current while retaining
  // any pages the visitor already chose to reveal.
  // biome-ignore lint/correctness/useExhaustiveDependencies: retryNonce deliberately reissues the same server query after an error
  useEffect(() => {
    if (activeKey !== "trending") return;
    let cancelled = false;

    const refreshTrending = async (initial: boolean) => {
      if (initial) {
        setTrendingLoading(true);
        setError(null);
      }

      try {
        const response = await api.getMarkets({
          status: "open",
          page: 1,
          pageSize: PAGE_SIZE,
          sort: "activity",
          categoryId,
        });
        if (cancelled) return;

        const next = response.data || [];
        setTrendingMarkets((current) =>
          initial || current.length <= PAGE_SIZE
            ? next
            : dedupeMarkets([...next, ...current]),
        );
        if (initial) setTrendingPage(response.meta.page);
        setTrendingHasNext((current) =>
          initial ? response.meta.hasNext : current || response.meta.hasNext,
        );
      } catch (cause: unknown) {
        if (cancelled || !initial) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (initial && !cancelled) setTrendingLoading(false);
      }
    };

    void refreshTrending(true);
    const refreshInterval = window.setInterval(() => {
      void refreshTrending(false);
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
    };
  }, [activeKey, categoryId, retryNonce]);

  // The six non-default rankings need fields that the public list endpoint
  // does not sort on. Load a bounded, real activity corpus and rank only its
  // actual API fields; the result never invents a discussion or price signal.
  // biome-ignore lint/correctness/useExhaustiveDependencies: retryNonce deliberately reissues the same bounded ranking query after an error
  useEffect(() => {
    if (activeKey === "trending" || rankingCatalog.length > 0) return;
    let cancelled = false;
    setCatalogLoading(true);
    setError(null);
    api
      .getMarkets({
        status: "open",
        page: 1,
        pageSize: RANKING_CATALOG_SIZE,
        sort: "activity",
        categoryId,
      })
      .then((response) => {
        if (!cancelled) setRankingCatalog(response.data || []);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeKey, categoryId, rankingCatalog.length, retryNonce]);

  const historyCandidates = useMemo(
    () =>
      dedupeMarkets([
        ...rankingCatalog,
        ...discovery.featured,
        ...discovery.trending,
        ...discovery.closingSoon,
      ])
        .filter((market) => !categoryId || market.categoryId === categoryId)
        .slice(0, RANKING_CATALOG_SIZE),
    [categoryId, discovery, rankingCatalog],
  );

  // Exactly like /discover, 24h movement is sourced from verified price
  // history. It is deliberately fetched only when the user asks for a mover
  // ranking, at bounded concurrency.
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeKey and retryNonce deliberately restart a cancelled or failed mover request
  useEffect(() => {
    if (!usesMovement || historyCandidates.length === 0) {
      setLoadingMovements(false);
      return;
    }
    const corpusKey = historyCandidates.map(marketKey).join("|");
    if (completedMovementCorpusRef.current === corpusKey) return;

    let cancelled = false;
    setLoadingMovements(true);
    setMovementError(null);
    setMovements({});
    void mapWithConcurrency(
      historyCandidates,
      HISTORY_FETCH_CONCURRENCY,
      async (market) => {
        try {
          const history = await api.getMarketPriceHistory(market.id, "1d");
          return [marketKey(market), movementFromHistory(history)] as const;
        } catch {
          return [marketKey(market), null] as const;
        }
      },
    )
      .then((entries) => {
        if (cancelled) return;

        // A partial price-history corpus is not a sound ranking. Do not
        // quietly turn a backend outage into the normal empty state, and do
        // not cache it: the Retry action must be able to make a fresh request.
        if (entries.some(([, movement]) => movement === null)) {
          setMovementError(
            "24-hour movement data could not be loaded. Try again.",
          );
          return;
        }

        setMovements(Object.fromEntries(entries));
        completedMovementCorpusRef.current = corpusKey;
      })
      .finally(() => {
        if (!cancelled) setLoadingMovements(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeKey, historyCandidates, retryNonce, usesMovement]);

  const rankings = useMemo(() => {
    if (rankingCatalog.length === 0) return [];
    return buildDiscoverRankings({
      // Discover's editorial bucket contains only a small fixed number of
      // markets. For this paginated grid, retain it first and complete the
      // activity list with the same real gateway activity corpus.
      discovery: {
        ...discovery,
        trending: dedupeMarkets([...discovery.trending, ...rankingCatalog]),
      },
      catalog: rankingCatalog,
      movements,
      categoryId,
      limit: RANKING_CATALOG_SIZE,
    });
  }, [categoryId, discovery, movements, rankingCatalog]);
  const activeRanking = rankings.find((ranking) => ranking.key === activeKey);
  const rankedMarkets = activeRanking?.markets ?? [];
  const visibleRankedMarkets = rankedMarkets.slice(0, rankingDisplayCount);
  const isLoading =
    activeKey === "trending"
      ? trendingLoading
      : catalogLoading || (usesMovement && loadingMovements);
  const visibleMarkets =
    activeKey === "trending" ? trendingMarkets : visibleRankedMarkets;
  const activeError = usesMovement ? movementError ?? error : error;
  const activeLoadMoreError =
    loadMoreError?.key === activeKey ? loadMoreError : null;
  const loadingMore = loadingMoreKey === activeKey;
  const canLoadMore =
    activeKey === "trending"
      ? trendingHasNext
      : visibleRankedMarkets.length < rankedMarkets.length;

  function selectRanking(key: DiscoverRankingKey) {
    setActiveKey(key);
    setRankingDisplayCount(PAGE_SIZE);
    setError(null);
    setMovementError(null);
  }

  function handleRankingKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    key: DiscoverRankingKey,
  ) {
    const currentIndex = DISCOVER_RANKING_SECTIONS.findIndex(
      (section) => section.key === key,
    );
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % DISCOVER_RANKING_SECTIONS.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex =
          (currentIndex - 1 + DISCOVER_RANKING_SECTIONS.length) %
          DISCOVER_RANKING_SECTIONS.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = DISCOVER_RANKING_SECTIONS.length - 1;
        break;
      default:
        return;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const nextKey = DISCOVER_RANKING_SECTIONS[nextIndex].key;
    selectRanking(nextKey);
    document.getElementById(`moments-ranking-tab-${nextKey}`)?.focus();
  }

  function loadMore() {
    if (loadingMore || !canLoadMore) return;
    if (activeKey !== "trending") {
      setRankingDisplayCount((count) => count + PAGE_SIZE);
      return;
    }

    setLoadingMoreKey("trending");
    setLoadMoreError(null);
    const requestId = loadMoreRequestRef.current + 1;
    loadMoreRequestRef.current = requestId;
    api
      .getMarkets({
        status: "open",
        page: trendingPage + 1,
        pageSize: PAGE_SIZE,
        sort: "activity",
        categoryId,
      })
      .then((response) => {
        if (loadMoreRequestRef.current !== requestId) return;
        const next = response.data || [];
        setTrendingMarkets((current) => dedupeMarkets([...current, ...next]));
        setTrendingPage(response.meta.page);
        setTrendingHasNext(response.meta.hasNext);
      })
      .catch((cause: unknown) => {
        if (loadMoreRequestRef.current !== requestId) return;
        setLoadMoreError({
          key: "trending",
          message: cause instanceof Error ? cause.message : String(cause),
        });
      })
      .finally(() => {
        if (loadMoreRequestRef.current === requestId) {
          setLoadingMoreKey(null);
        }
      });
  }

  const marketHeading =
    activeKey === "trending"
      ? t("TRENDING_MARKETS", "Trending markets")
      : `${activeSection.heading} ${t("MARKETS", "markets")}`;
  const marketDescription =
    activeKey === "trending"
      ? t(
          "MARKET_IMPLIED_ACTIVITY",
          "Market-implied activity · updated continuously",
        )
      : activeSection.description;

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
        className="mt-5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-testid="moments-ranking-tabs"
      >
        <div
          role="tablist"
          aria-label={t("DISCOVER_RANKINGS", "Market rankings")}
          className="flex min-w-max items-center gap-2"
        >
          {DISCOVER_RANKING_SECTIONS.map((section) => {
            const selected = section.key === activeKey;
            return (
              <button
                key={section.key}
                id={`moments-ranking-tab-${section.key}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="moments-ranking-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => selectRanking(section.key)}
                onKeyDown={(event) => handleRankingKeyDown(event, section.key)}
                className={`min-h-9 cursor-pointer whitespace-nowrap rounded-[12px] border bg-[var(--surface-1)] px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] ${
                  selected
                    ? "border-[var(--brand-purple)] bg-[var(--brand-lavender)] text-[var(--accent-text)]"
                    : "border-[var(--border-1)] text-[var(--t2)] hover:border-[var(--brand-purple)] hover:bg-[var(--brand-lavender)] hover:text-[var(--accent-text)]"
                }`}
              >
                {section.heading}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-7 flex items-end justify-between gap-4 max-[640px]:mt-6 max-[640px]:items-start max-[640px]:flex-col">
        <h2
          id="moments-market-heading"
          className="type-display m-0 text-[22px] font-semibold tracking-[-0.02em] text-[var(--t1)] max-[640px]:text-[20px]"
        >
          {marketHeading}
        </h2>
        <p className="mb-0 text-right text-[12px] leading-5 text-[var(--t3)] max-[640px]:text-left">
          {marketDescription}
        </p>
      </div>

      <div
        id="moments-ranking-panel"
        role="tabpanel"
        aria-labelledby={`moments-ranking-tab-${activeKey}`}
        className="mt-4"
      >
        {activeError && visibleMarkets.length === 0 ? (
          <div
            role="alert"
            className="rounded-[12px] border border-[var(--border-1)] border-l-[3px] border-l-[var(--brand-purple)] bg-[var(--surface-1)] px-5 py-4"
          >
            <p className="m-0 text-sm font-semibold text-[var(--t1)]">
              {t("COULD_NOT_LOAD_MARKETS", "Markets could not be loaded")}
            </p>
            <p className="mb-0 mt-1 text-[13px] text-[var(--t2)]">
              {activeError}
            </p>
            <button
              type="button"
              onClick={() => setRetryNonce((nonce) => nonce + 1)}
              className="mt-3 min-h-10 cursor-pointer rounded-[8px] border border-[var(--border-2)] bg-[var(--surface-1)] px-4 text-[13px] font-semibold text-[var(--accent-text)] transition-colors hover:border-[var(--brand-purple)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]"
            >
              {t("RETRY", "Retry")}
            </button>
          </div>
        ) : isLoading && visibleMarkets.length === 0 ? (
          <GridSkeleton />
        ) : visibleMarkets.length > 0 ? (
          <MarketGrid markets={visibleMarkets} columns={3} />
        ) : (
          <EmptyRanking message={activeSection.empty} />
        )}
      </div>

      {activeLoadMoreError && visibleMarkets.length > 0 && (
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

      {canLoadMore && (
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
