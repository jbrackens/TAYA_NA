"use client";

import Link from "next/link";
import { CpuIcon as Cpu } from "@phosphor-icons/react/dist/csr/Cpu";
import { ArrowSquareOutIcon as ExternalLink } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { FileTextIcon as FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { XIcon as X } from "@phosphor-icons/react/dist/csr/X";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { Sheet } from "../ui/Sheet.lazy";
import type {
  Category,
  DiscoveryResponse,
  OrderSide,
  PredictionMarket,
} from "@taptrade-ui/api-client/src/prediction-types";
import { useAuth } from "../../hooks/useAuth";
import { CoachCallout } from "./CoachCallout";
import { InviteRibbon } from "./InviteRibbon";
import {
  COACH_BEATS,
  COACH_RESTORED,
  clearTradeDraft,
  dismissInvite,
  isInviteDismissed,
  pickTeachingMarket,
  readTradeDraft,
  saveTradeDraft,
} from "./onboarding";
import { tickClass } from "./live";
import { usePriceTick } from "./utils/usePriceTick";
import { useLiveMarketUpdates } from "./utils/useLiveMarketUpdates";
import { formatCompactPoints } from "../../lib/points";
import { localizedMarket } from "./market-content";
import {
  heroChartPath,
  movementFromSeries,
  sparklineFromValues,
} from "./utils/spark";
import { getMarketImageProps } from "./utils/marketImage";
import { useMoversHistories } from "./utils/useMoversHistories";
import { ConnectedTradeTicket } from "./ConnectedTradeTicket";
import { AllMarketsSection } from "./AllMarketsSection";
import {
  TERMINAL_CATEGORY_ICONS,
  TerminalCategoryRail,
} from "./TerminalCategoryRail";
import { MomentCard } from "./MomentCard";
import {
  deriveMoments,
  formatCompactCountdown,
  groupFeedByEvent,
  settlingSoon,
} from "./moments";

interface PredictionWorkspaceProps {
  discovery: DiscoveryResponse;
  categories: Category[];
  catalogCategories: Category[];
}

const MAX_FEATURED_SLIDES = 4;
const FEATURED_CATEGORY_PRIORITY = [
  "sports",
  "entertainment",
  "politics",
  "tech",
  "technology",
  "economics",
  "general",
] as const;

function marketCategory(market: PredictionMarket): string {
  return (market.categorySlug || market.categoryName || "")
    .trim()
    .toLowerCase();
}

function uniqueMarkets(discovery: DiscoveryResponse): PredictionMarket[] {
  const seen = new Set<string>();
  const markets: PredictionMarket[] = [];
  for (const market of [
    ...discovery.featured,
    ...discovery.trending,
    ...discovery.closingSoon,
    ...discovery.recent,
  ]) {
    if (seen.has(market.id)) continue;
    seen.add(market.id);
    markets.push(market);
  }
  return markets;
}

function selectFeaturedMarkets(
  markets: PredictionMarket[],
): PredictionMarket[] {
  if (markets.length <= 1) return markets;

  const selected: PredictionMarket[] = [];
  const selectedIds = new Set<string>();
  const selectedCategories = new Set<string>();

  const add = (market: PredictionMarket) => {
    selected.push(market);
    selectedIds.add(market.id);
    const category = marketCategory(market);
    if (category) selectedCategories.add(category);
  };

  add(markets[0]);

  for (const category of FEATURED_CATEGORY_PRIORITY) {
    if (selectedCategories.has(category)) continue;
    const market = markets
      .slice(1)
      .find((candidate) => marketCategory(candidate) === category);
    if (!market) continue;
    add(market);
    if (selected.length === MAX_FEATURED_SLIDES) return selected;
  }

  for (const market of markets.slice(1)) {
    const category = marketCategory(market);
    if (!category || selectedCategories.has(category)) continue;
    add(market);
    if (selected.length === MAX_FEATURED_SLIDES) return selected;
  }

  for (const market of markets.slice(1)) {
    if (selectedIds.has(market.id)) continue;
    add(market);
    if (selected.length === MAX_FEATURED_SLIDES) break;
  }

  return selected;
}

function formatCloseAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function sourceLabel(source: string): string {
  if (!source.trim()) return "—";
  return source
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function settlementRuleLabel(market: PredictionMarket): string {
  const rule = market.settlementRule.trim();
  const isMachineToken = /^[a-z0-9_:-]+$/i.test(rule);
  if (!rule || isMachineToken) {
    return (
      market.description?.trim() ||
      `Resolves from ${sourceLabel(market.settlementSourceKey)} under the published market rules.`
    );
  }
  return rule;
}

function ProbabilityGauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="img"
      className="relative h-[70px] w-[126px] shrink-0"
      aria-label={`${clamped}%`}
    >
      <svg viewBox="0 0 126 72" className="h-full w-full" aria-hidden="true">
        <path
          d="M 13 62 A 50 50 0 0 1 113 62"
          pathLength="100"
          fill="none"
          stroke="var(--border-2)"
          strokeWidth="8"
          strokeLinecap="butt"
        />
        <path
          d="M 13 62 A 50 50 0 0 1 113 62"
          pathLength="100"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeLinecap="butt"
          strokeDasharray={`${clamped} 100`}
        />
      </svg>
      {/* Step 3: a probability is a magnitude — ink, never the accent (spec §2). */}
      <span className="absolute inset-x-0 bottom-0 text-center font-mono text-[20px] font-semibold text-[var(--t1)] tabular-nums">
        {clamped}
      </span>
    </div>
  );
}

function SignalChart({
  values,
  label,
  compact = false,
}: {
  values?: number[];
  label: string;
  compact?: boolean;
}) {
  const { t } = useTranslation("prediction");
  const gradientId = useId().replace(/:/g, "");
  const height = compact ? 160 : 250;
  const chart =
    values && values.length >= 2 ? heroChartPath(values, 800, height) : null;

  if (!chart) {
    return (
      <div
        className={`grid w-full place-items-center rounded-md border border-dashed border-[var(--border-1)] bg-[var(--surface-1)] text-[12px] text-[var(--t3)] ${
          compact ? "h-[160px]" : "h-[250px]"
        }`}
      >
        {t("CHART_NO_HISTORY")}
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 800 ${height}`}
      preserveAspectRatio="none"
      className={`block w-full ${compact ? "h-[160px]" : "h-[250px]"}`}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.24" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line
          key={ratio}
          x1="0"
          x2="800"
          y1={height * ratio}
          y2={height * ratio}
          stroke="var(--border-1)"
          strokeDasharray="3 5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path d={chart.fill} fill={`url(#${gradientId})`} />
      <path
        d={chart.line}
        fill="none"
        stroke="var(--accent-lo)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={chart.end.x}
        cy={chart.end.y}
        r="4.5"
        fill="var(--accent-lo)"
        stroke="var(--surface-1)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function FeaturedSignal({
  market,
  values,
  onTrade,
}: {
  market: PredictionMarket;
  values?: number[];
  onTrade: () => void;
}) {
  const { t } = useTranslation("prediction");
  const heroTick = usePriceTick(market.yesPricePoints);
  const movement = movementFromSeries(values);
  const description = market.description?.trim() || market.settlementRule;

  return (
    <section className="grid min-h-[346px] grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)] overflow-hidden rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)] max-[760px]:grid-cols-1">
      <div className="flex flex-col border-r border-[var(--border-1)] p-6 max-[760px]:border-b max-[760px]:border-r-0">
        <span className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-text)]">
          {market.categoryName || market.categorySlug || t("FEATURED_MARKET")}
        </span>
        <h2 className="type-display m-0 text-[clamp(25px,2.2vw,34px)] font-semibold leading-[1.08] text-[var(--t1)]">
          {market.title}
        </h2>
        {description && (
          <p className="mt-5 line-clamp-4 text-[14px] leading-[1.55] text-[var(--t2)]">
            {description}
          </p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-5 text-[12px] text-[var(--t2)]">
          <FileText size={15} weight="regular" aria-hidden="true" />
          <span>
            {t("SETTLEMENT_SOURCE", {
              source: sourceLabel(market.settlementSourceKey),
            })}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-col p-7 max-[760px]:p-5">
        <div className="mb-3 flex items-start justify-between gap-5">
          <div>
            <div className="text-[12px] font-medium text-[var(--t2)]">
              {t("LATEST_PROBABILITY")}
            </div>
            {/* Step 3: the 68px hero readout is the spec's named example of an
                uncoloured magnitude — ink, delta beside it carries colour. */}
            <div
              className={`mt-1 w-fit font-mono text-[clamp(46px,5vw,68px)] font-semibold leading-none tracking-[-0.04em] text-[var(--t1)] tabular-nums ${tickClass(heroTick)}`}
            >
              {market.yesPricePoints}¢
            </div>
            {movement && (
              <div
                className={`mt-2 font-mono text-[12px] font-semibold tabular-nums ${movement.up ? "text-[var(--yes-text)]" : "text-[var(--no-text)]"}`}
              >
                {movement.up ? "↑" : "↓"} {Math.abs(movement.deltaPoints)}¢ (
                {Math.abs(movement.pct).toFixed(1)}%) · {t("TODAY")}
              </div>
            )}
          </div>
          <ProbabilityGauge value={market.yesPricePoints} />
        </div>
        <div className="mt-auto min-h-0">
          <SignalChart
            values={values}
            compact
            label={t("YES_PRICE_CHART", { ticker: market.ticker })}
          />
        </div>
        <button
          type="button"
          onClick={onTrade}
          className="mt-4 hidden min-h-[52px] w-full cursor-pointer items-center justify-center rounded-md border-0 bg-[var(--accent)] px-5 text-[15px] font-semibold text-[var(--ticket-cta-text)] transition-[filter] hover:brightness-[1.05] max-[1179px]:flex"
        >
          {t("REVIEW_TRADE")}
        </button>
      </div>
    </section>
  );
}

function CarouselChevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path
        d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeaturedSignalCarousel({
  markets,
  histories,
  activeMarketId,
  onActiveMarketChange,
  onTrade,
}: {
  markets: PredictionMarket[];
  histories: ReadonlyMap<string, number[]>;
  activeMarketId: string;
  onActiveMarketChange: (marketId: string) => void;
  onTrade: (marketId: string) => void;
}) {
  const { t } = useTranslation("prediction");
  const stageRef = useRef<HTMLDivElement | null>(null);
  const activeIndex = Math.max(
    0,
    markets.findIndex((market) => market.id === activeMarketId),
  );
  const activeMarket = markets[activeIndex];
  const count = markets.length;

  const goTo = useCallback(
    (index: number) => {
      if (count < 2) return;
      const nextIndex = ((index % count) + count) % count;
      onActiveMarketChange(markets[nextIndex].id);
    },
    [count, markets, onActiveMarketChange],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: slide-in animation keyed to the active market changing — intentional signal dependency
  useEffect(() => {
    const stage = stageRef.current;
    if (
      !stage ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const animation = stage.animate(
      [
        { opacity: 0, transform: "translateX(12px)" },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: 240, easing: "ease-out", fill: "both" },
    );
    return () => animation.cancel();
  }, [activeMarket?.id]);

  if (!activeMarket) return null;

  const slideLabel =
    activeMarket.categoryName ||
    activeMarket.categorySlug ||
    t("FEATURED_MARKET");

  return (
    <section
      aria-roledescription="carousel"
      aria-labelledby="featured-markets-heading"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          goTo(activeIndex - 1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          goTo(activeIndex + 1);
        }
      }}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1
          id="featured-markets-heading"
          className="type-display m-0 text-[32px] font-semibold leading-tight text-[var(--t1)] max-[520px]:text-[26px]"
        >
          {t("FEATURED_MARKET")}
        </h1>

        {count > 1 && (
          // biome-ignore lint/a11y/useSemanticElements: labeled control group; fieldset/legend swap is queued for the P2 primitives pass (fieldset layout quirks)
          <div
            role="group"
            className="flex shrink-0 items-center gap-2"
            aria-label={t("FEATURED_MARKETS")}
          >
            <span
              className="min-w-[58px] text-center font-mono text-[12px] font-semibold text-[var(--t3)] tabular-nums max-[520px]:hidden"
              aria-live="polite"
            >
              {t("CAROUSEL_COUNT", { index: activeIndex + 1, count })}
            </span>
            <button
              type="button"
              className="grid size-11 cursor-pointer place-items-center rounded-md border border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--t2)] transition-[border-color,box-shadow] hover:border-[var(--border-2)] hover:shadow-[var(--shadow-card-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              aria-label={t("PREVIOUS_FEATURED_MARKET")}
              onClick={() => goTo(activeIndex - 1)}
            >
              <CarouselChevron direction="left" />
            </button>
            <button
              type="button"
              className="grid size-11 cursor-pointer place-items-center rounded-md border border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--t2)] transition-[border-color,box-shadow] hover:border-[var(--border-2)] hover:shadow-[var(--shadow-card-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              aria-label={t("NEXT_FEATURED_MARKET")}
              onClick={() => goTo(activeIndex + 1)}
            >
              <CarouselChevron direction="right" />
            </button>
          </div>
        )}
      </header>

      {/* biome-ignore lint/a11y/useSemanticElements: APG carousel pattern: role=group + aria-roledescription is the correct markup; fieldset would be wrong here */}
      <div
        ref={stageRef}
        key={activeMarket.id}
        role="group"
        aria-roledescription="slide"
        aria-label={t("FEATURED_MARKET_SLIDE_LABEL", {
          label: slideLabel,
          index: activeIndex + 1,
          count,
        })}
      >
        <FeaturedSignal
          market={activeMarket}
          values={histories.get(activeMarket.ticker)}
          onTrade={() => onTrade(activeMarket.id)}
        />
      </div>
    </section>
  );
}

function MarketAvatar({ market }: { market: PredictionMarket }) {
  const image = getMarketImageProps({
    ticker: market.ticker,
    imagePath: market.imagePath,
    imageUrl: market.imageUrl,
    image_url: market.image_url,
    categoryLabel: market.categoryName || market.categorySlug,
  });
  const [imageFailed, setImageFailed] = useState(false);
  const fallback = getMarketImageProps({
    ticker: market.ticker,
    categoryLabel: market.categoryName || market.categorySlug,
  });
  const visible = image.kind === "image" && !imageFailed ? image : fallback;
  const CategoryIcon =
    TERMINAL_CATEGORY_ICONS[(market.categorySlug || "").toLowerCase()] ?? Cpu;

  return visible.kind === "image" ? (
    <img
      src={visible.src}
      alt=""
      aria-hidden="true"
      className="h-12 w-12 shrink-0 rounded-md object-cover"
      onError={() => setImageFailed(true)}
    />
  ) : (
    <span
      className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-[var(--border-1)] bg-[linear-gradient(145deg,var(--surface-3),var(--surface-2))] text-[var(--accent-text)]"
      aria-hidden="true"
    >
      <CategoryIcon size={22} weight="duotone" />
    </span>
  );
}

function MarketSignalRow({
  market,
  values,
  selected,
  onSelect,
}: {
  market: PredictionMarket;
  values?: number[];
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation("prediction");
  const rowTick = usePriceTick(market.yesPricePoints);
  const movement = movementFromSeries(values);
  const spark = values ? sparklineFromValues(values, 64, 26, 12) : "";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-testid={`market-signal-row-${market.id}`}
      className={`grid min-h-[88px] w-full cursor-pointer grid-cols-[minmax(230px,1.6fr)_105px_105px_118px_100px_minmax(130px,0.8fr)] items-center gap-4 rounded-md border border-l-2 px-4 py-3 text-left transition-[background-color,border-color,transform] duration-150 max-[1190px]:grid-cols-[minmax(220px,1.5fr)_90px_90px_105px_minmax(120px,0.8fr)] max-[1190px]:[&_.terminal-liquidity]:hidden max-[720px]:grid-cols-[minmax(0,1fr)_74px] max-[720px]:gap-3 max-[720px]:px-3 ${
        selected
          ? "border-[var(--border-2)] border-l-[var(--accent-lo)] bg-[var(--surface-2)]"
          : "border-[var(--border-1)] bg-[var(--surface-1)] hover:-translate-y-px hover:border-[var(--border-2)] hover:bg-[var(--surface-2)]"
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <MarketAvatar market={market} />
        <span className="min-w-0">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-text)]">
            {market.categoryName || market.categorySlug || t("MARKET_ORDER")}
          </span>
          <span className="line-clamp-2 block text-[14px] font-medium leading-[1.35] text-[var(--t1)]">
            {market.title}
          </span>
        </span>
      </span>

      <span
        className={`w-fit font-mono text-[22px] font-semibold text-[var(--t1)] tabular-nums max-[720px]:text-right ${tickClass(rowTick)}`}
      >
        {market.yesPricePoints}¢
      </span>

      <span className="max-[720px]:hidden">
        {movement ? (
          <span
            className={`flex items-center gap-2 font-mono text-[12px] font-semibold tabular-nums ${movement.up ? "text-[var(--yes-text)]" : "text-[var(--no-text)]"}`}
          >
            <svg
              viewBox="0 0 64 26"
              className="h-[26px] w-16"
              aria-hidden="true"
            >
              <path
                d={spark}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <span>
              {movement.up ? "+" : ""}
              {movement.deltaPoints}¢
            </span>
          </span>
        ) : (
          <span className="font-mono text-[12px] text-[var(--t4)]">—</span>
        )}
      </span>

      <span className="font-mono text-[11px] leading-[1.45] text-[var(--t2)] max-[720px]:hidden">
        {formatCloseAt(market.closeAt)}
      </span>
      <span className="terminal-liquidity font-mono text-[12px] text-[var(--t2)] max-[720px]:hidden">
        {formatCompactPoints(market.liquidityPoints)}
      </span>
      <span className="flex min-w-0 items-center gap-2 text-[11px] leading-[1.4] text-[var(--t2)] max-[720px]:hidden">
        <FileText size={14} weight="regular" aria-hidden="true" />
        <span className="line-clamp-2">
          {sourceLabel(market.settlementSourceKey)}
        </span>
      </span>
    </button>
  );
}

function TradePreview({
  market,
  values,
  variant,
  onClose,
  onMarketUpdate,
  coachSlot,
  defaultSide,
}: {
  market: PredictionMarket;
  values?: number[];
  /** rail = the ≥1180px sticky right column; sheet = inside ui/Sheet. */
  variant: "rail" | "sheet";
  onClose?: () => void;
  onMarketUpdate: (market: PredictionMarket) => void;
  /** Onboarding coach beat rendered directly above the ticket. */
  coachSlot?: ReactNode;
  /** Restored trade-draft side (first-trade onboarding). */
  defaultSide?: OrderSide;
}) {
  const { t } = useTranslation("prediction");
  const previewTick = usePriceTick(market.yesPricePoints);
  const source = sourceLabel(market.settlementSourceKey);

  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <h2
          data-testid="selected-market-title"
          className="type-display m-0 text-[25px] font-semibold leading-[1.08] text-[var(--t1)]"
        >
          {market.title}
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={`/market/${market.ticker}`}
            className="grid size-11 place-items-center rounded-md text-[var(--t3)] no-underline transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--t1)]"
            aria-label={t("MARKET_DETAILS")}
          >
            <ExternalLink size={18} weight="regular" aria-hidden="true" />
          </Link>
          {variant === "sheet" && (
            <button
              type="button"
              onClick={onClose}
              className="grid size-11 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-[var(--t3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--t1)]"
              aria-label={t("CLOSE_TRADE_PREVIEW")}
            >
              <X size={18} weight="regular" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-[12px] font-medium text-[var(--t2)]">
            {t("LATEST_PROBABILITY")}
          </div>
          <div
            className={`mt-1 w-fit font-mono text-[48px] font-semibold leading-none tracking-[-0.04em] text-[var(--t1)] tabular-nums ${tickClass(previewTick)}`}
          >
            {market.yesPricePoints}¢
          </div>
        </div>
        <ProbabilityGauge value={market.yesPricePoints} />
      </div>

      {variant === "rail" && (
        <div className="mt-4">
          <SignalChart
            values={values}
            compact
            label={t("YES_PRICE_CHART", { ticker: market.ticker })}
          />
        </div>
      )}

      <div className="mt-4 rounded-md border border-[var(--border-1)] bg-[var(--surface-2)] p-3.5">
        <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--t2)]">
          <FileText size={15} weight="regular" aria-hidden="true" />
          <span>{t("SETTLEMENT_SOURCE", { source })}</span>
        </div>
        <p className="mt-2 line-clamp-3 text-[12px] leading-[1.5] text-[var(--t2)]">
          {settlementRuleLabel(market)}
        </p>
      </div>

      {coachSlot ? <div className="mt-4">{coachSlot}</div> : null}
      <div className="mt-4 rounded-md border border-[var(--border-1)] bg-[var(--surface-1)] p-4">
        <ConnectedTradeTicket
          // defaultSide seeds INITIAL state — a restored draft must
          // remount the ticket for its side to apply, hence the key.
          key={`${market.id}:${defaultSide ?? "unset"}`}
          market={market}
          defaultSide={defaultSide}
          defaultAmount={100}
          onMarketUpdate={onMarketUpdate}
        />
      </div>
    </>
  );

  if (variant === "sheet") return body;

  return (
    <aside
      aria-label={t("TRADE_PREVIEW")}
      className="terminal-scrollbar sticky top-[74px] h-[calc(100vh-74px)] overflow-y-auto border-l border-[var(--border-1)] bg-[var(--surface-1)] p-5 max-[1179px]:hidden"
    >
      {body}
    </aside>
  );
}

export function PredictionWorkspace({
  discovery,
  categories,
  catalogCategories,
}: PredictionWorkspaceProps) {
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
  const baseMarkets = useMemo(
    () =>
      uniqueMarkets(discovery).map((market) =>
        localizedMarket(contentT, market),
      ),
    [contentT, discovery],
  );
  const [marketOverrides, setMarketOverrides] = useState<
    Record<string, PredictionMarket>
  >({});
  const markets = useMemo(
    () => baseMarkets.map((market) => marketOverrides[market.id] ?? market),
    [baseMarkets, marketOverrides],
  );
  const handleMarketUpdate = useCallback(
    (market: PredictionMarket) => {
      const localized = localizedMarket(contentT, market);
      setMarketOverrides((current) => ({
        ...current,
        [market.id]: localized,
      }));
    },
    [contentT],
  );
  const featuredMarkets = useMemo(
    () => selectFeaturedMarkets(markets),
    [markets],
  );
  const featuredMarketIds = useMemo(
    () => new Set(featuredMarkets.map((market) => market.id)),
    [featuredMarkets],
  );
  const [activeFeaturedId, setActiveFeaturedId] = useState(
    featuredMarkets[0]?.id ?? "",
  );
  const activeFeatured =
    featuredMarkets.find((market) => market.id === activeFeaturedId) ??
    featuredMarkets[0] ??
    null;
  // Moments IA (DESIGN.md; Figma 03 Screens → Feed v2): events are the
  // unit of discovery. A 60s clock keeps countdowns honest without
  // re-deriving on every render.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  // Live-ness: subscribe the visible surface to real market:{id} events —
  // /predict stops being a still life. Auth-gated like the detail page.
  const marketsRef = useRef(markets);
  marketsRef.current = markets;
  const handleRealtimeFields = useCallback(
    (marketId: string, fields: Partial<PredictionMarket>) => {
      setMarketOverrides((current) => {
        const base =
          current[marketId] ??
          marketsRef.current.find((market) => market.id === marketId);
        if (!base) return current;
        return { ...current, [marketId]: { ...base, ...fields } };
      });
    },
    [],
  );
  const moments = useMemo(() => deriveMoments(markets, 4), [markets]);
  const settlesSoon = useMemo(
    () => settlingSoon(markets, nowMs, 24 * 3_600_000, 3),
    [markets, nowMs],
  );
  const settlesSoonIds = useMemo(
    () => new Set(settlesSoon.map((market) => market.id)),
    [settlesSoon],
  );
  // The soon-lane RELOCATES its markets out of the feed (a market appears
  // once); cap raised 4 → 8 so event clusters stay visible below it.
  const rowMarkets = markets
    .filter(
      (market) =>
        !featuredMarketIds.has(market.id) && !settlesSoonIds.has(market.id),
    )
    .slice(0, 8);
  const feedGroups = useMemo(() => groupFeedByEvent(rowMarkets), [rowMarkets]);
  const [selectedId, setSelectedId] = useState(
    activeFeatured?.id ?? rowMarkets[0]?.id ?? "",
  );
  const [mobileTradeOpen, setMobileTradeOpen] = useState(false);
  const selected =
    markets.find((market) => market.id === selectedId) ?? activeFeatured;
  const historyTickers = useMemo(
    () =>
      Array.from(
        new Set(
          [...featuredMarkets, ...rowMarkets].map((market) => market.ticker),
        ),
      ).filter(Boolean),
    [featuredMarkets, rowMarkets],
  );
  const { histories } = useMoversHistories(historyTickers);
  const showFeaturedMarket = useCallback((marketId: string) => {
    setActiveFeaturedId(marketId);
    setSelectedId(marketId);
  }, []);
  // Reactive ≤1179px band: the rail unmounts and the ticket lives in the
  // vaul sheet instead (never both — two mounted tickets would double
  // preview fetches and fork amount state). SSR/first paint renders the
  // rail; CSS hides it on the band until the effect flips the state.
  const [isMobileBand, setIsMobileBand] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1179px)");
    const sync = () => setIsMobileBand(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!isMobileBand) setMobileTradeOpen(false);
  }, [isMobileBand]);

  const openTrade = (marketId: string) => {
    setSelectedId(marketId);
    if (isMobileBand) setMobileTradeOpen(true);
  };

  // First-trade onboarding (frontend slice — Figma 03 Screens → First-trade
  // onboarding). Teach on the real surface, gate at commitment: the ribbon
  // invites signed-out visitors, three coach beats annotate the live ticket
  // of a real teaching market, and the drafted intent survives the auth
  // redirect. The welcome grant + settlement notification are BACKEND rules
  // (not faked here); until they land a fresh account falls through to the
  // ticket's insufficient-points state and its Add-Points escape hatch.
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [inviteVisible, setInviteVisible] = useState(false);
  const [guideStage, setGuideStage] = useState<"off" | 1 | 2 | 3 | "restored">(
    "off",
  );
  const [restoredSide, setRestoredSide] = useState<OrderSide | undefined>(
    undefined,
  );
  useEffect(() => {
    if (authLoading) return;
    setInviteVisible(!isAuthenticated && !isInviteDismissed());
  }, [authLoading, isAuthenticated]);
  const startGuide = useCallback(() => {
    const teaching = pickTeachingMarket(markets, Date.now());
    if (!teaching) return;
    setSelectedId(teaching.id);
    if (isMobileBand) setMobileTradeOpen(true);
    setGuideStage(1);
    setInviteVisible(false);
  }, [markets, isMobileBand]);
  const endGuide = useCallback(() => setGuideStage("off"), []);
  const dismissRibbon = useCallback(() => {
    dismissInvite();
    setInviteVisible(false);
  }, []);
  // While guided and signed out, the intent persists continuously — the
  // guided script trades YES, so the draft side is YES by construction.
  useEffect(() => {
    if (guideStage === "off" || guideStage === "restored") return;
    if (isAuthenticated || !selected) return;
    saveTradeDraft({
      marketId: selected.id,
      side: "yes",
      savedAtMs: Date.now(),
    });
  }, [guideStage, isAuthenticated, selected]);
  // After signup/login the draft restores once: reselect the market, show
  // the restored coach note, and clear — a draft never restores twice.
  const restoredOnceRef = useRef(false);
  useEffect(() => {
    if (authLoading || !isAuthenticated || restoredOnceRef.current) return;
    const draft = readTradeDraft(Date.now());
    if (!draft) return;
    if (!markets.some((market) => market.id === draft.marketId)) return;
    restoredOnceRef.current = true;
    setSelectedId(draft.marketId);
    setRestoredSide(draft.side);
    setGuideStage("restored");
    clearTradeDraft();
  }, [authLoading, isAuthenticated, markets]);
  const activeBeat =
    guideStage === "off"
      ? null
      : guideStage === "restored"
        ? COACH_RESTORED
        : COACH_BEATS[guideStage - 1];
  const coachSlot: ReactNode = activeBeat ? (
    <CoachCallout
      line={t(activeBeat.line)}
      step={t(activeBeat.step)}
      skipLabel={t("ONBOARD_SKIP")}
      onAdvance={() => {
        if (guideStage === "restored" || guideStage === 3) {
          endGuide();
        } else if (guideStage !== "off") {
          setGuideStage((guideStage + 1) as 1 | 2 | 3);
        }
      }}
      onSkip={endGuide}
    />
  ) : null;

  // Bounded live-channel set: the visible surface only (featured, soon
  // lane, feed rows, current selection), never the whole catalog.
  const liveIds = useMemo(() => {
    const ids = new Set<string>();
    for (const market of [...featuredMarkets, ...settlesSoon, ...rowMarkets]) {
      if (ids.size >= 16) break;
      ids.add(market.id);
    }
    if (selected) ids.add(selected.id);
    return [...ids];
  }, [featuredMarkets, settlesSoon, rowMarkets, selected]);
  useLiveMarketUpdates(
    liveIds,
    isAuthenticated && !authLoading,
    handleRealtimeFields,
  );

  if (!activeFeatured || !selected) {
    return (
      <div className="grid min-h-[calc(100vh-74px)] place-items-center text-[14px] text-[var(--t3)]">
        {t("NO_FEATURED_MARKETS")}
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[1920px] grid-cols-[200px_minmax(0,1fr)_380px] items-start bg-[var(--bg-deep)] max-[1279px]:grid-cols-[72px_minmax(0,1fr)_340px] max-[1179px]:grid-cols-[72px_minmax(0,1fr)] max-[1023px]:grid-cols-1">
      <TerminalCategoryRail categories={categories} mode="predict" />

      <div className="min-w-0 px-9 py-8 max-[1279px]:px-6 max-[760px]:px-4 max-[760px]:py-6">
        {inviteVisible && (
          <div className="mb-5">
            <InviteRibbon
              line={t("ONBOARD_INVITE")}
              ctaLabel={t("ONBOARD_SHOW_ME")}
              dismissLabel={t("ONBOARD_DISMISS")}
              onStart={startGuide}
              onDismiss={dismissRibbon}
            />
          </div>
        )}
        <FeaturedSignalCarousel
          markets={featuredMarkets}
          histories={histories}
          activeMarketId={activeFeatured.id}
          onActiveMarketChange={showFeaturedMarket}
          onTrade={openTrade}
        />

        {moments.length > 0 && (
          <section className="mt-7" aria-labelledby="happening-now-heading">
            <h2
              id="happening-now-heading"
              className="m-0 mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]"
            >
              {t("HAPPENING_NOW")}
            </h2>
            <div className="flex gap-2.5 max-[760px]:flex-col">
              {moments.map((moment) => {
                const countdown = formatCompactCountdown(
                  moment.firstCloseMs - nowMs,
                );
                return (
                  <MomentCard
                    key={moment.eventId}
                    meta={
                      countdown
                        ? `${moment.title} · ${t("FIRST_CLOSE", { countdown })}`
                        : moment.title
                    }
                    title={moment.headline.title}
                    secondary={moment.secondary}
                    countLabel={`${t("MOMENT_MARKETS_COUNT", { count: moment.marketCount })} →`}
                    selected={selected.id === moment.headline.id}
                    onSelect={() => openTrade(moment.headline.id)}
                  />
                );
              })}
            </div>
          </section>
        )}

        {settlesSoon.length > 0 && (
          <section className="mt-7" aria-labelledby="settles-soon-heading">
            <h2
              id="settles-soon-heading"
              className="m-0 mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]"
            >
              {t("SETTLES_WITHIN_24H")}
            </h2>
            <div className="flex flex-col gap-1.5">
              {settlesSoon.map((market) => (
                <MarketSignalRow
                  key={market.id}
                  market={market}
                  values={histories.get(market.ticker)}
                  selected={selected.id === market.id}
                  onSelect={() => openTrade(market.id)}
                />
              ))}
            </div>
          </section>
        )}

        <section className="mt-7" aria-labelledby="more-markets-heading">
          <h2
            id="more-markets-heading"
            className="type-display m-0 mb-3 text-[21px] font-medium text-[var(--t1)]"
          >
            {t("MORE_MARKETS_FOR_YOU")}
          </h2>

          <div
            className="mb-2 grid grid-cols-[minmax(230px,1.6fr)_105px_105px_118px_100px_minmax(130px,0.8fr)] gap-4 px-4 text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--t3)] max-[1190px]:grid-cols-[minmax(220px,1.5fr)_90px_90px_105px_minmax(120px,0.8fr)] max-[1190px]:[&_.terminal-liquidity]:hidden max-[720px]:hidden"
            aria-hidden="true"
          >
            <span>{t("MARKET_ORDER")}</span>
            <span>{t("IMPLIED_PROBABILITY")}</span>
            <span>{t("DAY_CHANGE")}</span>
            <span>{t("CLOSES")}</span>
            <span className="terminal-liquidity">{t("LIQUIDITY")}</span>
            <span>{t("SOURCE")}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            {feedGroups.map((group) => {
              if (group.kind === "single") {
                return (
                  <MarketSignalRow
                    key={group.market.id}
                    market={group.market}
                    values={histories.get(group.market.ticker)}
                    selected={selected.id === group.market.id}
                    onSelect={() => openTrade(group.market.id)}
                  />
                );
              }
              const { cluster } = group;
              const countdown = formatCompactCountdown(
                cluster.firstCloseMs - nowMs,
              );
              return (
                <div key={cluster.eventId} className="flex flex-col gap-1.5">
                  <div className="mt-2 flex items-center gap-2.5 px-1 first:mt-0">
                    <span
                      aria-hidden="true"
                      className="h-3 w-[3px] rounded-[1px] bg-[var(--lime-text)]"
                    />
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink)]">
                      {cluster.title}
                    </span>
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">
                      {t("MOMENT_MARKETS_COUNT", {
                        count: cluster.markets.length,
                      })}
                      {countdown
                        ? ` · ${t("FIRST_CLOSE", { countdown })}`
                        : ""}
                    </span>
                  </div>
                  {cluster.markets.map((market) => (
                    <MarketSignalRow
                      key={market.id}
                      market={market}
                      values={histories.get(market.ticker)}
                      selected={selected.id === market.id}
                      onSelect={() => openTrade(market.id)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        <section
          className="mt-10 border-t border-[var(--border-1)] pt-8"
          aria-labelledby="available-markets-heading"
        >
          <h2
            id="available-markets-heading"
            className="type-display m-0 text-[26px] font-semibold leading-tight text-[var(--t1)]"
          >
            {t("AVAILABLE_MARKETS", "Available markets")}
          </h2>
          <AllMarketsSection categories={catalogCategories} />
        </section>

        <p className="mb-0 mt-8 border-t border-[var(--border-1)] pt-4 text-[11px] leading-[1.5] text-[var(--t3)]">
          {t("MARKET_RISK_FOOTER")}
        </p>
      </div>

      {!isMobileBand && (
        <TradePreview
          variant="rail"
          market={selected}
          values={histories.get(selected.ticker)}
          onMarketUpdate={handleMarketUpdate}
          coachSlot={coachSlot}
          defaultSide={restoredSide}
        />
      )}
      {isMobileBand && (
        <Sheet
          open={mobileTradeOpen}
          onOpenChange={setMobileTradeOpen}
          title={t("TRADE_PREVIEW")}
        >
          <TradePreview
            variant="sheet"
            market={selected}
            values={histories.get(selected.ticker)}
            onClose={() => setMobileTradeOpen(false)}
            onMarketUpdate={handleMarketUpdate}
            coachSlot={coachSlot}
            defaultSide={restoredSide}
          />
        </Sheet>
      )}
    </div>
  );
}
