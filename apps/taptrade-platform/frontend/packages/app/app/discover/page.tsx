"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { CpuIcon as Cpu } from "@phosphor-icons/react/dist/csr/Cpu";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  Category,
  DiscoveryResponse,
  MarketPriceHistory,
  PageMeta,
  PredictionMarket,
} from "@taptrade-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import TapDot from "../components/TapDot";
import {
  dedupeMarkets,
  normalizePriceShares,
} from "../components/prediction/market-display";
import { localizedMarket } from "../components/prediction/market-content";
import {
  TERMINAL_CATEGORY_ICONS,
  TerminalCategoryRail,
} from "../components/prediction/TerminalCategoryRail";
import { getMarketImageProps } from "../components/prediction/utils/marketImage";
import { sparklineFromValues } from "../components/prediction/utils/spark";
import { logger } from "../lib/logger";
import { formatCompactPoints } from "../lib/points";

const api = createPredictionClient();
const PAGE_SIZE = 8;
const HISTORY_FETCH_CONCURRENCY = 4;
const LAUNCH_CATEGORY_SLUGS = new Set([
  "sports",
  "politics",
  "entertainment",
  "economics",
  "tech",
  "technology",
]);

type MarketFilter = "trending" | "active" | "yes" | "no" | "closing";

interface MarketMovement {
  pct: number;
  direction: "up" | "down" | "flat";
  values: number[];
}

const MARKET_ROW_GRID_CLASS =
  "grid grid-cols-[minmax(300px,1.7fr)_130px_105px_120px_110px_200px] items-center gap-4 max-[1350px]:grid-cols-[minmax(280px,1.6fr)_120px_100px_110px_190px] max-[1350px]:[&_.market-volume]:hidden max-[1040px]:grid-cols-[minmax(250px,1.5fr)_110px_100px_180px] max-[1040px]:[&_.market-change]:hidden max-[760px]:grid-cols-[minmax(0,1fr)_80px] max-[760px]:gap-3 max-[760px]:[&_.market-closes]:hidden";

function marketKey(market: PredictionMarket): string {
  return market.id || market.ticker;
}

function getSentiment(market: PredictionMarket): {
  label: string;
  tone: "yes" | "no" | "neutral";
  yesShare: number;
  noShare: number;
} {
  const { yesShare, noShare } = normalizePriceShares(
    market.yesPricePoints,
    market.noPricePoints,
  );
  if (yesShare >= 60)
    return { label: "Yes-leaning", tone: "yes", yesShare, noShare };
  if (noShare >= 60)
    return { label: "No-leaning", tone: "no", yesShare, noShare };
  return { label: "Balanced", tone: "neutral", yesShare, noShare };
}

function movementFromHistory(
  history: MarketPriceHistory,
): MarketMovement | null {
  const values = history.points
    .map((point) => point.yesPricePoints)
    .filter((value) => Number.isFinite(value));
  if (values.length < 2) return null;
  const first = values[0];
  const last = values[values.length - 1];
  if (!first) return null;
  const delta = last - first;
  return {
    pct: Math.abs((delta / first) * 100),
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    values,
  };
}

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

function averageYesShare(markets: PredictionMarket[]): number {
  if (markets.length === 0) return 0;
  return Math.round(
    markets.reduce(
      (sum, market) =>
        sum +
        normalizePriceShares(market.yesPricePoints, market.noPricePoints)
          .yesShare,
      0,
    ) / markets.length,
  );
}

function formatCloseAt(value: string): { date: string; time: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "—", time: "" };
  return {
    date: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function MarketThumbnail({ market }: { market: PredictionMarket }) {
  const image = getMarketImageProps({
    ticker: market.ticker,
    imagePath: market.imagePath,
    imageUrl: market.imageUrl,
    image_url: market.image_url,
    categoryLabel: market.categoryName || market.categorySlug,
  });
  const [failed, setFailed] = useState(false);
  const Icon =
    TERMINAL_CATEGORY_ICONS[(market.categorySlug || "").toLowerCase()] ?? Cpu;

  if (image.kind === "image" && !failed) {
    return (
      <img
        src={image.src}
        alt=""
        aria-hidden="true"
        onError={() => setFailed(true)}
        className="size-12 shrink-0 rounded-md object-cover"
      />
    );
  }
  return (
    <span
      className="grid size-12 shrink-0 place-items-center rounded-md border border-[var(--border-1)] bg-[var(--surface-3)] text-[var(--accent-text)]"
      aria-hidden="true"
    >
      <Icon size={22} weight="duotone" />
    </span>
  );
}

function MarketRow({
  market,
  rank,
  movement,
}: {
  market: PredictionMarket;
  rank: number;
  movement?: MarketMovement | null;
}) {
  const sentiment = getSentiment(market);
  const close = formatCloseAt(market.closeAt);
  const probability = Math.round(sentiment.yesShare);
  const spark = movement
    ? sparklineFromValues(movement.values, 64, 24, 12)
    : "";
  const sentimentClass =
    sentiment.tone === "yes"
      ? "text-[var(--yes-text)]"
      : sentiment.tone === "no"
        ? "text-[var(--no-text)]"
        : "text-[var(--t3)]";
  const changeClass =
    movement?.direction === "up"
      ? "text-[var(--yes-text)]"
      : movement?.direction === "down"
        ? "text-[var(--no-text)]"
        : "text-[var(--t3)]";
  const changeLabel =
    movement == null || movement.direction === "flat"
      ? "—"
      : `${movement.direction === "up" ? "+" : "-"}${movement.pct.toFixed(1)}%`;

  return (
    <article
      className={`${MARKET_ROW_GRID_CLASS} border-t border-[var(--border-1)] px-5 py-3.5 transition-colors first:border-t-0 hover:bg-[var(--surface-2)] max-[760px]:px-4`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="w-6 shrink-0 font-mono text-[12px] text-[var(--t3)] tabular-nums max-[900px]:hidden">
          {String(rank).padStart(2, "0")}
        </span>
        <MarketThumbnail market={market} />
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.09em]">
            <span className="text-[var(--accent-text)]">
              {market.categoryName || market.categorySlug || "Market"}
            </span>
            <span className={sentimentClass}>• {sentiment.label}</span>
          </div>
          <Link
            href={`/market/${market.ticker}`}
            className="line-clamp-2 text-[15px] font-medium leading-[1.35] text-[var(--t1)] no-underline hover:text-[var(--accent-text)]"
          >
            {market.title}
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 max-[760px]:justify-end">
        <span className="font-mono text-[22px] font-semibold text-[var(--accent-text)] tabular-nums">
          {probability}¢
        </span>
        {spark && (
          <svg
            viewBox="0 0 64 24"
            className="h-6 w-16 text-[var(--accent-lo)] max-[760px]:hidden"
            aria-hidden="true"
          >
            <path
              d={spark}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        )}
      </div>

      <span
        className={`market-change font-mono text-[12px] font-semibold tabular-nums ${changeClass}`}
      >
        {changeLabel}
      </span>
      <span className="market-volume font-mono text-[12px] text-[var(--t2)] tabular-nums">
        {formatCompactPoints(market.volumePoints)}
      </span>
      <span className="market-closes font-mono text-[11px] leading-[1.45] text-[var(--t2)] tabular-nums">
        <span className="block">{close.date}</span>
        <span className="block text-[var(--t3)]">{close.time}</span>
      </span>

      <div className="market-actions grid grid-cols-2 gap-2 max-[760px]:col-span-2">
        <Link
          href={`/market/${market.ticker}?side=yes`}
          className="flex min-h-11 items-center justify-between rounded-md border border-[var(--border-2)] bg-[var(--surface-1)] px-3 text-[12px] font-semibold text-[var(--yes-text)] no-underline transition-colors hover:border-[var(--yes-border)] hover:bg-[var(--yes-soft)]"
          aria-label={`Trade YES on ${market.title} at ${market.yesPricePoints} cents`}
        >
          <span>YES</span>
          <span className="font-mono text-[15px] tabular-nums">
            {market.yesPricePoints}¢
          </span>
        </Link>
        <Link
          href={`/market/${market.ticker}?side=no`}
          className="flex min-h-11 items-center justify-between rounded-md border border-[var(--border-2)] bg-[var(--surface-1)] px-3 text-[12px] font-semibold text-[var(--no-text)] no-underline transition-colors hover:border-[var(--no-border)] hover:bg-[var(--no-soft)]"
          aria-label={`Trade NO on ${market.title} at ${market.noPricePoints} cents`}
        >
          <span>NO</span>
          <span className="font-mono text-[15px] tabular-nums">
            {market.noPricePoints}¢
          </span>
        </Link>
      </div>
    </article>
  );
}

function filterDiscoveryMarkets(
  discovery: DiscoveryResponse,
  filter: MarketFilter,
  categoryId?: string,
): PredictionMarket[] {
  const pool = dedupeMarkets([
    ...discovery.trending,
    ...discovery.closingSoon,
  ]).filter((market) => !categoryId || market.categoryId === categoryId);
  if (filter === "trending") {
    return discovery.trending.filter(
      (market) => !categoryId || market.categoryId === categoryId,
    );
  }
  if (filter === "yes") {
    return pool.filter((market) => getSentiment(market).yesShare >= 60);
  }
  if (filter === "no") {
    return pool.filter((market) => getSentiment(market).noShare >= 60);
  }
  return pool;
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-10 shrink-0 rounded-md border px-4 text-[13px] font-medium transition-colors ${
        active
          ? "border-[var(--accent-lo)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
          : "border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--t2)] hover:border-[var(--border-2)] hover:text-[var(--t1)]"
      }`}
    >
      {children}
    </button>
  );
}

export default function DiscoverPage() {
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
  const searchParams = useSearchParams();
  const activeCategorySlug = (
    searchParams?.get("category") || ""
  ).toLowerCase();
  const [categories, setCategories] = useState<Category[]>([]);
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [meta, setMeta] = useState<PageMeta>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    hasNext: false,
  });
  const [movements, setMovements] = useState<
    Record<string, MarketMovement | null>
  >({});
  const [activeFilter, setActiveFilter] = useState<MarketFilter>("trending");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const visibleCategories = useMemo(
    () =>
      categories
        .filter((category) =>
          LAUNCH_CATEGORY_SLUGS.has(category.slug.toLowerCase()),
        )
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );
  const activeCategory = visibleCategories.find(
    (category) => category.slug.toLowerCase() === activeCategorySlug,
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([api.getDiscovery(), api.getCategories()])
      .then(([nextDiscovery, nextCategories]) => {
        if (cancelled) return;
        setDiscovery(nextDiscovery);
        setCategories(nextCategories);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadNonce]);

  useEffect(() => {
    setPage(1);
  }, [activeCategorySlug, activeFilter]);

  useEffect(() => {
    if (!discovery) return;
    let cancelled = false;
    setListLoading(true);
    setError(null);
    const categoryId = activeCategory?.id;

    const load = async () => {
      if (
        activeFilter === "trending" ||
        activeFilter === "yes" ||
        activeFilter === "no"
      ) {
        const filtered = filterDiscoveryMarkets(
          discovery,
          activeFilter,
          categoryId,
        );
        const start = (page - 1) * PAGE_SIZE;
        return {
          data: filtered.slice(start, start + PAGE_SIZE),
          meta: {
            page,
            pageSize: PAGE_SIZE,
            total: filtered.length,
            hasNext: start + PAGE_SIZE < filtered.length,
          },
        };
      }
      const sort = activeFilter === "closing" ? "closing_soon" : "activity";
      return api.getMarkets({
        categoryId,
        status: "open",
        sort,
        page,
        pageSize: PAGE_SIZE,
      });
    };

    load()
      .then((response) => {
        if (cancelled) return;
        setMarkets(response.data);
        setMeta(response.meta);
      })
      .catch((err: unknown) => {
        logger.error("DiscoverTerminal", "market catalog load failed", err);
        if (!cancelled) {
          setMarkets([]);
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCategory?.id, activeFilter, discovery, page, reloadNonce]);

  useEffect(() => {
    if (markets.length === 0) {
      setMovements({});
      return;
    }
    let cancelled = false;
    setMovements({});
    void mapWithConcurrency(
      markets,
      HISTORY_FETCH_CONCURRENCY,
      async (market) => {
        try {
          const history = await api.getMarketPriceHistory(market.id, "1d");
          return [marketKey(market), movementFromHistory(history)] as const;
        } catch {
          return [marketKey(market), null] as const;
        }
      },
    ).then((entries) => {
      if (!cancelled) setMovements(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [markets]);

  const pulseMarkets = useMemo(
    () =>
      discovery
        ? dedupeMarkets([...discovery.trending, ...discovery.closingSoon])
        : [],
    [discovery],
  );
  const localizedMarkets = useMemo(
    () => markets.map((market) => localizedMarket(contentT, market)),
    [contentT, markets],
  );
  const yesLeaning = pulseMarkets.filter(
    (market) => getSentiment(market).yesShare >= 60,
  ).length;
  const noLeaning = pulseMarkets.filter(
    (market) => getSentiment(market).noShare >= 60,
  ).length;
  const pulseVolume = pulseMarkets.reduce(
    (sum, market) => sum + market.volumePoints,
    0,
  );
  const filterOptions: Array<{ key: MarketFilter; label: string }> = [
    { key: "trending", label: "Trending" },
    { key: "active", label: "Most active" },
    { key: "yes", label: "Strong Yes" },
    { key: "no", label: "Strong No" },
    { key: "closing", label: "Closing soon" },
  ];
  const firstVisible =
    meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const lastVisible = Math.min(meta.page * meta.pageSize, meta.total);

  if (loading) {
    return (
      <div className="grid min-h-[calc(100vh-74px)] place-items-center bg-[var(--bg-deep)] text-[13px] text-[var(--t3)]">
        <TapDot label={t("DISCOVER_LOADING")} />
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[1920px] grid-cols-[200px_minmax(0,1fr)] items-start bg-[var(--bg-deep)] max-[1279px]:grid-cols-[72px_minmax(0,1fr)] max-[1023px]:grid-cols-1">
      <TerminalCategoryRail
        categories={visibleCategories}
        mode="discover"
        activeCategorySlug={activeCategory?.slug.toLowerCase()}
      />

      <section
        className="min-w-0 px-9 py-8 max-[1279px]:px-6 max-[760px]:px-4 max-[760px]:py-6"
        aria-labelledby="trending-heading"
      >
        <h1
          id="trending-heading"
          className="type-display m-0 text-[34px] font-semibold leading-tight text-[var(--t1)]"
        >
          {t("DISCOVER_TRENDING", "Trending")}
        </h1>
        <p className="mb-0 mt-2 text-[13px] leading-relaxed text-[var(--t3)]">
          {t(
            "TRENDING_SIGNAL_SUBTITLE",
            "Strong signals and time-sensitive markets, ranked for what needs attention now.",
          )}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-3 text-[12px] text-[var(--t2)]">
          <span className="font-semibold text-[var(--t1)]">Signal pulse:</span>
          <span className="font-mono text-[var(--accent-text)] tabular-nums">
            {averageYesShare(pulseMarkets)}% Yes
          </span>
          <span aria-hidden="true">•</span>
          <span>
            <strong className="font-mono text-[var(--yes-text)]">
              {yesLeaning}
            </strong>{" "}
            above 60% Yes
          </span>
          <span aria-hidden="true">•</span>
          <span>
            <strong className="font-mono text-[var(--no-text)]">
              {noLeaning}
            </strong>{" "}
            above 60% No
          </span>
          <span aria-hidden="true">•</span>
          <span>
            <strong className="font-mono text-[var(--accent-text)]">
              {formatCompactPoints(pulseVolume)}
            </strong>{" "}
            across {pulseMarkets.length} signal markets
          </span>
        </div>

        <nav
          className="terminal-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1"
          aria-label="Trending filters"
        >
          {filterOptions.map((option) => (
            <FilterButton
              key={option.key}
              active={activeFilter === option.key}
              onClick={() => setActiveFilter(option.key)}
            >
              {option.label}
            </FilterButton>
          ))}
        </nav>

        <section
          className="mt-4 overflow-hidden rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)]"
          aria-label="Trending prediction markets"
          aria-busy={listLoading}
        >
          <div
            className={`${MARKET_ROW_GRID_CLASS} border-b border-[var(--border-1)] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--t3)] max-[760px]:hidden`}
            aria-hidden="true"
          >
            <span>Market</span>
            <span>Probability</span>
            <span className="market-change">24h change</span>
            <span className="market-volume">Volume</span>
            <span className="market-closes">Closes</span>
            <span className="text-right">Trade</span>
          </div>

          {error ? (
            <div className="px-6 py-14 text-center">
              <h2 className="m-0 text-[18px] font-semibold text-[var(--t1)]">
                Trending markets could not be loaded
              </h2>
              <p className="mx-auto mt-2 max-w-[520px] text-[13px] text-[var(--t3)]">
                {error}
              </p>
              <button
                type="button"
                onClick={() => setReloadNonce((value) => value + 1)}
                className="mt-5 min-h-11 rounded-md border border-[var(--border-2)] bg-[var(--surface-2)] px-5 text-[13px] font-semibold text-[var(--t1)] hover:border-[var(--accent-lo)]"
              >
                Retry
              </button>
            </div>
          ) : localizedMarkets.length === 0 && !listLoading ? (
            <div className="px-6 py-14 text-center text-[13px] text-[var(--t3)]">
              No signal markets match this view.
            </div>
          ) : (
            <div className={listLoading ? "opacity-60" : "opacity-100"}>
              {localizedMarkets.map((market, index) => (
                <MarketRow
                  key={marketKey(market)}
                  market={market}
                  rank={(meta.page - 1) * meta.pageSize + index + 1}
                  movement={movements[marketKey(market)]}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 border-t border-[var(--border-1)] px-5 py-3.5 text-[12px] text-[var(--t3)] max-[640px]:px-4">
            <span className="font-mono tabular-nums">
              Showing {firstVisible}–{lastVisible} of {meta.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1 || listLoading}
                className="grid size-10 place-items-center rounded-md border border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--t2)] hover:border-[var(--border-2)] hover:text-[var(--t1)] disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Previous page"
              >
                <CaretLeftIcon size={16} aria-hidden="true" />
              </button>
              <span className="grid min-w-10 min-h-10 place-items-center rounded-md border border-[var(--accent-lo)] bg-[var(--accent-soft)] px-3 font-mono text-[var(--accent-text)] tabular-nums">
                {page}
              </span>
              <button
                type="button"
                onClick={() => setPage((value) => value + 1)}
                disabled={!meta.hasNext || listLoading}
                className="grid size-10 place-items-center rounded-md border border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--t2)] hover:border-[var(--border-2)] hover:text-[var(--t1)] disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Next page"
              >
                <CaretRightIcon size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <p className="mb-0 mt-4 border-t border-[var(--border-1)] pt-4 text-[11px] leading-[1.5] text-[var(--t3)]">
          {t("MARKET_RISK_FOOTER")}
        </p>
      </section>
    </div>
  );
}
