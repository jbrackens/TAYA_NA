"use client";

/**
 * DiscoverPage — "What's moving right now" (Ink & lime step 5,
 * Discover.dc.html 14a/14b).
 *
 * Structure: featured hero (DiscoveryHero — the 64px ink price, honest
 * chart, Buy pair) above two INDEPENDENT sections:
 *   Trending      — rows lead with the 24h delta (why you care: movement)
 *   Closing soon  — rows lead with time remaining (why you care: urgency)
 * Each section owns its 18b empty state, because on a quiet day either
 * list can be empty on its own.
 *
 * The movement pipeline is honest by construction: deltas come only from
 * the real /prices series (rows show "—" while loading or when history
 * is missing — never an invented number), and the hero's chart keeps the
 * same discipline (no line without history; synthetic shapes only behind
 * the demo flag, labelled "Simulated data").
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CpuIcon as Cpu } from "@phosphor-icons/react/dist/csr/Cpu";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  Category,
  DiscoveryResponse,
  PredictionMarket,
} from "@taptrade-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import TapDot from "../components/TapDot";
import { Card } from "../components/ui";
import { DiscoveryHero } from "../components/prediction/DiscoveryHero";
import { normalizePriceShares } from "../components/prediction/market-display";
import { localizedMarket } from "../components/prediction/market-content";
import {
  TERMINAL_CATEGORY_ICONS,
  TerminalCategoryRail,
} from "../components/prediction/TerminalCategoryRail";
import { getMarketImageProps } from "../components/prediction/utils/marketImage";
// Step 10: movement derivation shared with the /predict feed —
// extracted so the two surfaces can't drift on honesty rules.
import {
  movementFromHistory,
  type MarketMovement,
} from "../components/prediction/market-movement";
import { logger } from "../lib/logger";

const api = createPredictionClient();
const SECTION_ROWS = 5;
const HISTORY_FETCH_CONCURRENCY = 4;
const LAUNCH_CATEGORY_SLUGS = new Set([
  "sports",
  "politics",
  "entertainment",
  "economics",
  "tech",
  "technology",
]);

// Phosphor "warning-circle-fill", copied VERBATIM from
// design_handoff_taptrade/logos/phosphor-paths.json (MIT; filled 256 grid).
const PHOSPHOR_WARNING_CIRCLE_FILL =
  "M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z";

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

/** "12d" / "5h 12m" / "42m" — the closing-soon lead fact. */
function timeRemaining(closeAt: string): { label: string; urgent: boolean } {
  const deltaMs = new Date(closeAt).getTime() - Date.now();
  if (!Number.isFinite(deltaMs) || deltaMs <= 0)
    return { label: "—", urgent: false };
  const totalMin = Math.floor(deltaMs / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const urgent = deltaMs < 24 * 60 * 60 * 1000;
  if (days > 0) return { label: `${days}d ${hours}h`, urgent };
  if (hours > 0) return { label: `${hours}h ${mins}m`, urgent };
  return { label: `${mins}m`, urgent };
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
        className="size-10 shrink-0 rounded-[10px] object-cover"
      />
    );
  }
  return (
    <span
      className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-[var(--border-1)] bg-[var(--surface-2)] text-[var(--t3)]"
      aria-hidden="true"
    >
      <Icon size={20} weight="duotone" />
    </span>
  );
}

/**
 * One discovery row (14b). `lead` decides the right-column sub-fact:
 * trending rows carry the 24h delta, closing-soon rows carry time left —
 * different reasons to care.
 */
function SectionRow({
  market,
  movement,
  lead,
}: {
  market: PredictionMarket;
  movement?: MarketMovement | null;
  lead: "delta" | "time";
}) {
  const sentiment = getSentiment(market);
  const probability = Math.round(sentiment.yesShare);
  const remaining = timeRemaining(market.closeAt);

  const deltaNode = (() => {
    if (lead === "time") {
      return (
        <span
          className={`block font-mono text-[11px] font-medium tabular-nums ${
            remaining.urgent ? "text-[var(--no-text)]" : "text-[var(--t3)]"
          }`}
        >
          {remaining.label}
        </span>
      );
    }
    if (movement == null || movement.direction === "flat") {
      return (
        <span className="block font-mono text-[11px] font-medium text-[var(--t3)] tabular-nums">
          —
        </span>
      );
    }
    const up = movement.direction === "up";
    return (
      <span
        className={`block font-mono text-[11px] font-medium tabular-nums ${
          up ? "text-[var(--yes-text)]" : "text-[var(--no-text)]"
        }`}
      >
        {up ? "+" : "−"}
        {Math.abs(movement.deltaPoints)}¢
      </span>
    );
  })();

  return (
    <Link
      href={`/market/${market.ticker}`}
      className="block rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-3.5 no-underline transition-[border-color,box-shadow] duration-150 hover:border-[var(--border-2)] hover:shadow-[var(--shadow-card-hover)]"
    >
      <article className="flex items-start gap-3">
        <MarketThumbnail market={market} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--t3)]">
            <span>{market.categoryName || market.categorySlug || "Market"}</span>
            <span
              aria-hidden="true"
              className="h-[3px] w-[3px] flex-none rounded-full bg-[var(--border-2)]"
            />
            {lead === "time" ? (
              <span
                className={`font-mono text-[10px] font-medium normal-case tracking-normal tabular-nums ${
                  remaining.urgent ? "text-[var(--no-text)]" : "text-[var(--t3)]"
                }`}
              >
                closes in {remaining.label}
              </span>
            ) : (
              <span className="font-mono text-[10px] font-medium normal-case tracking-normal text-[var(--t3)]">
                {sentiment.label}
              </span>
            )}
          </div>
          <h4 className="m-0 mt-1 line-clamp-2 text-[14px] font-medium leading-[1.35] tracking-[-0.005em] text-[var(--t1)]">
            {market.title}
          </h4>
        </div>
        <div className="flex-none text-right">
          <span className="block font-mono text-[19px] font-medium leading-[1.1] text-[var(--t1)] tabular-nums">
            {probability}¢
          </span>
          {deltaNode}
        </div>
      </article>
    </Link>
  );
}

function SectionEmpty({ children }: { children: React.ReactNode }) {
  // States 18b: dashed frame; discovery emptiness is about time, so no
  // action button — the lists populate as markets attract activity.
  return (
    <Card
      as="div"
      variant="dashed"
      padding="none"
      className="px-[18px] py-[26px] text-center"
    >
      <p className="m-0 text-[13px] leading-[1.55] text-[var(--t2)]">
        {children}
      </p>
    </Card>
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
  const [movements, setMovements] = useState<
    Record<string, MarketMovement | null>
  >({});
  const [loading, setLoading] = useState(true);
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadNonce is the retry signal — an intentional extra dependency
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
        logger.error("Discover", "discovery load failed", err);
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

  const byCategory = (market: PredictionMarket) =>
    !activeCategory || market.categoryId === activeCategory.id;

  const heroMarket = useMemo(() => {
    if (!discovery) return null;
    return (
      [...discovery.featured, ...discovery.trending].find(byCategory) ?? null
    );
    // biome-ignore lint/correctness/useExhaustiveDependencies: byCategory is derived from activeCategory below
  }, [discovery, activeCategory]);

  const trendingRows = useMemo(
    () =>
      (discovery?.trending ?? [])
        .filter(byCategory)
        .filter((m) => m.id !== heroMarket?.id)
        .slice(0, SECTION_ROWS)
        .map((m) => localizedMarket(contentT, m)),
    // biome-ignore lint/correctness/useExhaustiveDependencies: byCategory is derived from activeCategory
    [discovery, activeCategory, heroMarket?.id, contentT],
  );

  const closingRows = useMemo(
    () =>
      (discovery?.closingSoon ?? [])
        .filter(byCategory)
        .slice()
        .sort(
          (a, b) =>
            new Date(a.closeAt).getTime() - new Date(b.closeAt).getTime(),
        )
        .slice(0, SECTION_ROWS)
        .map((m) => localizedMarket(contentT, m)),
    // biome-ignore lint/correctness/useExhaustiveDependencies: byCategory is derived from activeCategory
    [discovery, activeCategory, contentT],
  );

  // 24h deltas for the TRENDING rows only — closing-soon rows lead with
  // time and don't need history. Real /prices series or nothing.
  useEffect(() => {
    if (trendingRows.length === 0) {
      setMovements({});
      return;
    }
    let cancelled = false;
    setMovements({});
    void mapWithConcurrency(
      trendingRows,
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
  }, [trendingRows]);

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
        className="min-w-0 max-w-[1080px] px-9 py-8 max-[1279px]:px-6 max-[760px]:px-4 max-[760px]:py-6"
        aria-labelledby="discover-heading"
      >
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--t3)]">
          {t("DISCOVER_EYEBROW", "Discover")}
        </div>
        <h1
          id="discover-heading"
          className="type-display m-0 mt-2 text-[clamp(26px,3vw,34px)] font-semibold leading-[1.12] text-[var(--t1)]"
        >
          {t("DISCOVER_HEADING", "What's moving right now")}
        </h1>
        <p className="mb-0 mt-2 text-[13px] leading-relaxed text-[var(--t3)]">
          {t(
            "DISCOVER_SUBTITLE",
            "Markets ranked by 24h activity and the contracts closing soonest.",
          )}
        </p>

        {error ? (
          <Card
            as="div"
            edge="no"
            padding="none"
            className="mt-6 px-[18px] py-4"
            role="alert"
          >
            <div className="flex items-center gap-[9px]">
              <svg
                viewBox="0 0 256 256"
                width="16"
                height="16"
                fill="currentColor"
                aria-hidden="true"
                className="flex-none text-[var(--no)]"
              >
                <path d={PHOSPHOR_WARNING_CIRCLE_FILL} />
              </svg>
              <span className="text-sm font-semibold tracking-[-0.005em] text-[var(--t1)]">
                {t("DISCOVER_LOAD_FAILED", "Discovery could not be loaded")}
              </span>
            </div>
            <p className="mb-0 mt-[9px] text-[13px] leading-[1.5] text-[var(--t2)]">
              {error}
            </p>
            <button
              type="button"
              onClick={() => setReloadNonce((value) => value + 1)}
              className="mt-3.5 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] border border-[var(--border-2)] bg-[var(--surface-1)] px-[18px] text-[13px] font-semibold text-[var(--t1)] transition-[border-color] hover:border-[var(--t3)]"
            >
              {t("RETRY", "Retry")}
            </button>
          </Card>
        ) : (
          <>
            <div className="mt-6">
              <DiscoveryHero
                market={heroMarket}
                categoryName={
                  heroMarket
                    ? (visibleCategories.find(
                        (c) => c.id === heroMarket.categoryId,
                      )?.name ?? undefined)
                    : undefined
                }
              />
            </div>

            <div className="mt-8 grid grid-cols-2 items-start gap-8 max-[1100px]:grid-cols-1">
              <section aria-labelledby="trending-heading">
                <div className="flex items-baseline justify-between gap-3">
                  <h2
                    id="trending-heading"
                    className="m-0 text-[19px] font-medium tracking-[-0.01em] text-[var(--t1)]"
                  >
                    {t("DISCOVER_TRENDING", "Trending")}
                  </h2>
                  <Link
                    href="/predict"
                    className="inline-flex min-h-11 items-center text-[13px] font-semibold text-[var(--accent-text)] no-underline hover:underline"
                  >
                    {t("VIEW_ALL_MARKETS", "View all")}
                  </Link>
                </div>
                <p className="mb-3 mt-0.5 text-xs leading-[1.5] text-[var(--t3)]">
                  {t(
                    "DISCOVER_TRENDING_SUB",
                    "Ranked by 24h activity — the delta is the story.",
                  )}
                </p>
                {trendingRows.length === 0 ? (
                  <SectionEmpty>
                    {t(
                      "DISCOVER_TRENDING_EMPTY",
                      "Nothing trending yet. Markets appear here as trading picks up.",
                    )}
                  </SectionEmpty>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {trendingRows.map((market) => (
                      <SectionRow
                        key={marketKey(market)}
                        market={market}
                        movement={movements[marketKey(market)]}
                        lead="delta"
                      />
                    ))}
                  </div>
                )}
              </section>

              <section aria-labelledby="closing-heading">
                <div className="flex items-baseline justify-between gap-3">
                  <h2
                    id="closing-heading"
                    className="m-0 text-[19px] font-medium tracking-[-0.01em] text-[var(--t1)]"
                  >
                    {t("DISCOVER_CLOSING_SOON", "Closing soon")}
                  </h2>
                  <Link
                    href="/predict"
                    className="inline-flex min-h-11 items-center text-[13px] font-semibold text-[var(--accent-text)] no-underline hover:underline"
                  >
                    {t("VIEW_ALL_MARKETS", "View all")}
                  </Link>
                </div>
                <p className="mb-3 mt-0.5 text-xs leading-[1.5] text-[var(--t3)]">
                  {t(
                    "DISCOVER_CLOSING_SUB",
                    "Last chances first — time remaining is the story.",
                  )}
                </p>
                {closingRows.length === 0 ? (
                  <SectionEmpty>
                    {t(
                      "DISCOVER_CLOSING_EMPTY",
                      "No markets are closing soon. Check back as deadlines approach.",
                    )}
                  </SectionEmpty>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {closingRows.map((market) => (
                      <SectionRow
                        key={marketKey(market)}
                        market={market}
                        lead="time"
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        <p className="mb-0 mt-8 border-t border-[var(--border-1)] pt-4 text-[11px] leading-[1.5] text-[var(--t3)]">
          {t("MARKET_RISK_FOOTER")}
        </p>
      </section>
    </div>
  );
}
