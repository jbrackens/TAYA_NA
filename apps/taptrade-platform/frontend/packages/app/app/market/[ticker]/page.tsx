"use client";

/**
 * MarketDetailPage — Robinhood-treated market view (DESIGN.md §5 layout).
 *
 *   [breadcrumb]
 *   ┌──────────────────────────────┐ ┌─────────────┐
 *   │ Hero (MarketHead + Chart     │ │ TradeTicket │
 *   │       collapsed in one card) │ │ (sticky)    │
 *   ├──────────────────────────────┤ ├─────────────┤
 *   │ [OrderBook] [RecentTrades]   │ │ Related     │
 *   ├──────────────────────────────┤ │             │
 *   │ Market details & resolution  │ │             │
 *   └──────────────────────────────┘ └─────────────┘
 *
 * Data wiring is preserved from the prior versions: the gateway's REST
 * endpoints are untouched. Order-book markets render only real /orderbook
 * depth; AMM markets render an explicit curve-liquidity snapshot instead.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import MarketHead from "../../components/prediction/MarketHead";
import MarketChart from "../../components/prediction/MarketChart";
import MarketDiscussion from "../../components/prediction/MarketDiscussion";
import OrderBook from "../../components/prediction/OrderBook";
import type { BookLevel } from "../../components/prediction/OrderBook";
import RecentTrades from "../../components/prediction/RecentTrades";
import {
  TradeTicket,
  type TradeTicketSubmitOptions,
} from "../../components/prediction/TradeTicket";
import { logger } from "../../lib/logger";
import { subscribePredictWs } from "../../lib/websocket/predict-ws";
import { useAuth } from "../../hooks/useAuth";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import {
  selectCurrentBalance,
  setCurrentBalance,
} from "../../lib/store/pointBalanceSlice";
import { getBalance } from "../../lib/api/wallet-client";
import type {
  PredictionMarket,
  PredictionEvent,
  Trade,
  Category,
  OrderSide,
  OrderPreview,
  OrderBook as ApiOrderBook,
  Position,
} from "@taptrade-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import {
  orderSignature,
  resolveIdempotencyKey,
  type PendingIdempotency,
} from "../../lib/orderIdempotency";
import {
  categoryName,
  localizedMarket,
} from "../../components/prediction/market-content";
import {
  isOpenMarketStatus,
  formatCompactPoints,
  marketStatusLabel,
} from "../../components/prediction/market-display";

const api = createPredictionClient();

type LegacyMarketUpdate = Partial<PredictionMarket> & {
  yesPricePoints?: number;
  noPricePoints?: number;
  lastTradePricePoints?: number;
  volumePoints?: number;
  openInterestPoints?: number;
};

function normalizeMarketUpdateFields(
  payload: LegacyMarketUpdate,
): Partial<PredictionMarket> {
  const yesPricePoints =
    typeof payload.yesPricePoints === "number"
      ? payload.yesPricePoints
      : payload.yesPricePoints;
  const noPricePoints =
    typeof payload.noPricePoints === "number"
      ? payload.noPricePoints
      : payload.noPricePoints;
  const lastTradePricePoints =
    typeof payload.lastTradePricePoints === "number"
      ? payload.lastTradePricePoints
      : payload.lastTradePricePoints;
  const volumePoints =
    typeof payload.volumePoints === "number"
      ? payload.volumePoints
      : payload.volumePoints;
  const openInterestPoints =
    typeof payload.openInterestPoints === "number"
      ? payload.openInterestPoints
      : payload.openInterestPoints;
  const pointPayload = { ...payload };
  delete pointPayload.yesPricePoints;
  delete pointPayload.noPricePoints;
  delete pointPayload.lastTradePricePoints;
  delete pointPayload.volumePoints;
  delete pointPayload.openInterestPoints;

  return {
    ...pointPayload,
    ...(typeof yesPricePoints === "number" ? { yesPricePoints } : {}),
    ...(typeof noPricePoints === "number" ? { noPricePoints } : {}),
    ...(typeof lastTradePricePoints === "number"
      ? { lastTradePricePoints }
      : {}),
    ...(typeof volumePoints === "number" ? { volumePoints } : {}),
    ...(typeof openInterestPoints === "number" ? { openInterestPoints } : {}),
    unit: payload.unit || "PTS",
  };
}

// P11 (2026-07-12): the article page — no cards, no shadows. Modules sit
// flat on the paper and open with a rubric over a rule.
const RUBRIC_HEADING_CLASS =
  "m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--t1)]";
const MARKET_WRAP_CLASS = "text-[var(--t1)]";
const MARKET_CRUMB_CLASS =
  "mb-[18px] flex flex-wrap items-center gap-2 text-[13px] text-[var(--t3)]";
const MARKET_CRUMB_LINK_CLASS =
  "text-[var(--t2)] no-underline hover:text-[var(--t1)]";
const MARKET_CRUMB_SEP_CLASS = "opacity-50";
const MARKET_GRID_CLASS =
  "grid grid-cols-[minmax(0,_1fr)_360px] gap-6 max-[1100px]:grid-cols-1";
const MARKET_MAIN_CLASS = "flex min-w-0 flex-col gap-6 max-[1100px]:contents";
const MARKET_SIDE_CLASS = "flex min-w-0 flex-col gap-6 max-[1100px]:contents";
const MARKET_TICKET_STICKY_CLASS =
  "sticky top-[84px] max-[1100px]:static max-[1100px]:top-auto max-[1100px]:order-2";
const MARKET_DATA_ROW_CLASS =
  "grid grid-cols-2 gap-6 pt-4 max-[720px]:grid-cols-1";
const MARKET_DEPTH_DISCLOSURE_CLASS =
  "border-t border-[var(--border-2)] pt-3 font-sans max-[1100px]:order-3";
const MARKET_DEPTH_SUMMARY_CLASS =
  "cursor-pointer list-none text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--t2)] transition-colors duration-[120ms] hover:text-[var(--t1)] [&::-webkit-details-marker]:hidden";
const LIQUIDITY_CARD_CLASS =
  "border border-[var(--border-1)] bg-[var(--surface-1)] p-5 font-sans";
const LIQUIDITY_HEAD_CLASS =
  "mb-[14px] flex items-baseline justify-between border-b border-[var(--border-1)] pb-2";
const LIQUIDITY_TITLE_CLASS =
  "text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--t1)]";
const LIQUIDITY_BADGE_CLASS =
  "border border-[var(--border-2)] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--t3)]";
const LIQUIDITY_COPY_CLASS =
  "mb-4 max-w-[68ch] text-[13px] leading-5 text-[var(--t2)]";
const LIQUIDITY_GRID_CLASS = "grid grid-cols-2 gap-3";
const LIQUIDITY_METRIC_CLASS =
  "border-t border-[var(--border-1)] px-0.5 pt-2";
const LIQUIDITY_METRIC_LABEL_CLASS =
  "mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--t3)]";
const LIQUIDITY_METRIC_VALUE_CLASS =
  "font-mono text-[13px] font-semibold text-[var(--t1)] [font-variant-numeric:tabular-nums]";
const AMM_CURVE_CLASS = "mt-4 border-t border-[var(--border-1)] pt-3";
const AMM_CURVE_ROW_CLASS = "mb-3 last:mb-0";
const AMM_CURVE_HEAD_CLASS =
  "mb-2 flex items-center justify-between gap-3 text-[11px] text-[var(--t3)]";
const AMM_CURVE_LABEL_CLASS =
  "font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--t3)]";
const AMM_CURVE_VALUE_CLASS =
  "font-mono text-[11px] font-semibold text-[var(--t1)] [font-variant-numeric:tabular-nums]";
const AMM_CURVE_TRACK_CLASS =
  "relative flex h-3 overflow-hidden border border-[var(--border-1)] bg-[var(--surface-3)]";
const AMM_CURVE_YES_FILL_CLASS = "h-full bg-[color:var(--yes-bg)]";
const AMM_CURVE_NO_FILL_CLASS = "h-full bg-[color:var(--no-bg)]";
const AMM_CURVE_MARKER_CLASS =
  "absolute top-[-3px] h-[18px] w-0.5 bg-[var(--t1)]";
const AMM_CURVE_AXIS_CLASS =
  "mt-1 flex items-center justify-between font-mono text-[10px] text-[var(--t3)]";
const AMM_RESERVE_TRACK_CLASS =
  "flex h-3 overflow-hidden border border-[var(--border-1)] bg-[var(--surface-3)]";
const AMM_RESERVE_YES_CLASS = "h-full bg-[color:var(--yes-bg)]";
const AMM_RESERVE_NO_CLASS = "h-full bg-[color:var(--no-bg)]";
const AMM_QUOTE_LIST_CLASS = "mt-2 flex flex-col";
const AMM_QUOTE_ROW_CLASS =
  "grid grid-cols-[minmax(0,_1fr)_auto_auto] items-center gap-3 border-t border-[var(--border-1)] px-0.5 py-2 max-[520px]:grid-cols-1 max-[520px]:gap-1";
const AMM_QUOTE_LABEL_CLASS =
  "min-w-0 text-[12px] font-medium text-[var(--t1)]";
const AMM_QUOTE_VALUE_CLASS =
  "font-mono text-[11px] text-[var(--t2)] [font-variant-numeric:tabular-nums]";
// P11: the hero card is retired — MarketHead (article head, heavy ink
// rule) and MarketChart (print graphic) present themselves on the paper.
const MARKET_HERO_CLASS =
  "flex min-w-0 flex-col gap-4 max-[1100px]:order-1";
const MARKET_DETAILS_CLASS =
  "border-t border-[var(--border-2)] pt-3 font-sans max-[1100px]:order-4";
const MARKET_DETAILS_TITLE_CLASS = `${RUBRIC_HEADING_CLASS} mb-3`;
const MARKET_DETAILS_COPY_CLASS =
  "mb-2.5 max-w-[68ch] text-[15px] leading-[1.65] text-[var(--t2)]";
const MARKET_RULES_CLASS =
  "mt-[14px] flex list-none flex-col gap-2 border-t border-[var(--border-1)] p-0 pt-[14px]";
// Rule bullets carry a press-blue square marker — print furniture, not
// app dots.
const MARKET_RULE_CLASS =
  "relative pl-[18px] text-[13px] leading-[1.5] text-[var(--t2)] before:absolute before:left-0.5 before:top-[7px] before:h-1.5 before:w-1.5 before:bg-[var(--brand-dot)] before:content-['']";
const MARKET_SHARE_ROW_CLASS =
  "mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-1)] pt-4";
const MARKET_SHARE_BUTTON_CLASS =
  "inline-flex min-h-9 items-center justify-center border border-[var(--border-2)] bg-transparent px-3 text-xs font-bold text-[var(--t1)] transition-colors hover:bg-[var(--action-soft)]";
const MARKET_SHARE_STATUS_CLASS = "text-xs text-[var(--t3)]";
// Related markets — an editorial column of mini-briefs: rubric on a
// heavy rule, hairline-separated rows, serif titles, wire figures.
const RELATED_CARD_CLASS =
  "border-t-[3px] border-[var(--rule-ink)] pt-2 font-sans max-[1100px]:order-6";
const RELATED_TITLE_CLASS = `${RUBRIC_HEADING_CLASS} mb-1`;
const RELATED_EMPTY_CLASS = "pt-2 text-xs text-[var(--t3)]";
const RELATED_LIST_CLASS = "flex flex-col";
const RELATED_ROW_CLASS =
  "group block border-b border-[var(--border-1)] py-3 no-underline last:border-b-0 last:pb-0";
const RELATED_QUESTION_CLASS =
  "type-display mb-1.5 text-[15px] font-medium leading-[1.25] text-[var(--t1)] group-hover:underline";
const RELATED_LINE_CLASS =
  "flex items-baseline justify-between font-mono text-[11px] text-[var(--t3)] [font-variant-numeric:tabular-nums]";
const RELATED_YES_CLASS = "font-semibold text-[var(--yes-text)]";
const PAGE_STATE_WRAP_CLASS = "grid min-h-[60vh] place-items-center px-4 py-8";
// P11 page states — no card, no pill: a heavy ink rule, a rubric, a
// serif line, sitting directly on the paper.
const PAGE_STATE_CARD_CLASS =
  "w-[min(100%,480px)] border-t-[3px] border-[var(--rule-ink)] pt-3 text-left text-[var(--t1)]";
const PAGE_STATE_TITLE_CLASS =
  "type-display m-0 text-balance text-[26px] font-medium leading-[1.15]";
const PAGE_STATE_COPY_CLASS =
  "mt-2.5 mb-0 text-sm leading-[1.5] text-[var(--t2)]";
// P10: the glass-era mint-gradient CTA is retired — ink action (P11:
// flat, square, no hover lift).
const PAGE_STATE_ACTION_CLASS =
  "mt-[22px] inline-flex min-h-11 items-center justify-center border-0 bg-[var(--action)] px-5 text-sm font-bold text-(--action-fg) no-underline transition-colors duration-[120ms] hover:bg-[var(--action-hover)]";

function pageStateEyebrowClass(isError: boolean): string {
  return `mb-3 block text-[11px] font-bold uppercase tracking-[0.14em] ${
    isError ? "text-[var(--no-text)]" : "text-[var(--t3)]"
  }`;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function formatAMMShareCount(value?: number): string {
  if (!Number.isFinite(value) || (value ?? 0) <= 0) return "—";
  return Math.round(value ?? 0).toLocaleString();
}

/**
 * Adapt a real /orderbook response into the legacy {bids, asks} pair the
 * OrderBook presentational component expects. The visual convention is:
 *   - bids = YES buy orders (pricePoints = YES price ladder, descending)
 *   - asks = NO buy orders rendered as YES sells (the OrderBook component
 *     internally inverts NO bids to "ask at 100-NoBid"). For an exchange
 *     market we use the real NO bid ladder for the ask side; real YES
 *     sells (yes.asks) would also belong here but the component doesn't
 *     yet know how to merge two ask sources, so v1 keeps the NO-bids
 *     convention for backward visual parity.
 */
function adaptBookForDisplay(book: ApiOrderBook): {
  bids: BookLevel[];
  asks: BookLevel[];
} {
  const bids: BookLevel[] = book.yes.bids.map((lvl) => ({
    pricePoints: lvl.pricePoints,
    shares: lvl.shares,
    cumulativeShares: lvl.cumulativeShares,
  }));
  // Ask side: render NO bids in descending order for visual stack consistency.
  // The OrderBook component inverts these to "NO Xc" labels via its own logic.
  const asks: BookLevel[] = book.no.bids
    .slice()
    .reverse()
    .map((lvl) => ({
      pricePoints: lvl.pricePoints,
      shares: lvl.shares,
      cumulativeShares: lvl.cumulativeShares,
    }));
  return { bids, asks };
}

type OrderBookStatus = "idle" | "loading" | "ready" | "error";
type AMMQuoteStatus = "idle" | "loading" | "ready" | "error";

const AMM_QUOTE_SIZES = [1, 10, 25];

interface MarketDepthProps {
  ammQuoteStatus: AMMQuoteStatus;
  ammQuotes: OrderPreview[];
  market: PredictionMarket;
  orderBook: ApiOrderBook | null;
  orderBookStatus: OrderBookStatus;
}

function MarketDepth({
  ammQuoteStatus,
  ammQuotes,
  market,
  orderBook,
  orderBookStatus,
}: MarketDepthProps) {
  const { t } = useTranslation("prediction");
  if (market.executionMode === "order_book") {
    if (orderBook) {
      const { bids, asks } = adaptBookForDisplay(orderBook);
      return <OrderBook bids={bids} asks={asks} />;
    }
    const copy =
      orderBookStatus === "error"
        ? t(
            "ORDER_BOOK_UNAVAILABLE",
            "Real order book depth is unavailable right now.",
          )
        : t("ORDER_BOOK_LOADING", "Loading real order book depth.");
    return (
      <LiquiditySnapshot
        badge={t("ORDER_BOOK", "Order book")}
        copy={copy}
        market={market}
        title={t("ORDER_BOOK", "Order book")}
      />
    );
  }

  return (
    <LiquiditySnapshot
      badge={t("AMM", "AMM")}
      copy={t(
        "AMM_LIQUIDITY_MODEL_COPY",
        "Pricing uses the market's automated curve. This market does not show public order-book depth.",
      )}
      ammQuoteStatus={ammQuoteStatus}
      ammQuotes={ammQuotes}
      market={market}
      title={t("AMM_LIQUIDITY", "AMM liquidity")}
    />
  );
}

interface LiquiditySnapshotProps {
  ammQuoteStatus?: AMMQuoteStatus;
  ammQuotes?: OrderPreview[];
  badge: string;
  copy: string;
  market: PredictionMarket;
  title: string;
}

function LiquiditySnapshot({
  ammQuoteStatus = "idle",
  ammQuotes = [],
  badge,
  copy,
  market,
  title,
}: LiquiditySnapshotProps) {
  const { t } = useTranslation("prediction");
  const collateral = market.collateralPoolPoints ?? 0;
  const liquidityParam = market.ammLiquidityParam ?? 0;
  const metrics = [
    {
      label: t("YES_PRICE", "YES price"),
      value: `${market.yesPricePoints}¢`,
    },
    {
      label: t("NO_PRICE", "NO price"),
      value: `${market.noPricePoints}¢`,
    },
    {
      label: t("VISIBLE_LIQUIDITY", "Liquidity"),
      value: formatCompactPoints(market.liquidityPoints),
    },
    {
      label:
        collateral > 0 ? t("COLLATERAL_POOL", "Pool") : t("CURVE_K", "Curve K"),
      value:
        collateral > 0
          ? formatCompactPoints(collateral)
          : liquidityParam > 0
            ? liquidityParam.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })
            : "—",
    },
  ];
  return (
    <section className={LIQUIDITY_CARD_CLASS} aria-label={title}>
      <div className={LIQUIDITY_HEAD_CLASS}>
        <span className={LIQUIDITY_TITLE_CLASS}>{title}</span>
        <span className={LIQUIDITY_BADGE_CLASS}>{badge}</span>
      </div>
      <p className={LIQUIDITY_COPY_CLASS}>{copy}</p>
      <div className={LIQUIDITY_GRID_CLASS}>
        {metrics.map((metric) => (
          <div key={metric.label} className={LIQUIDITY_METRIC_CLASS}>
            <div className={LIQUIDITY_METRIC_LABEL_CLASS}>{metric.label}</div>
            <div className={LIQUIDITY_METRIC_VALUE_CLASS}>{metric.value}</div>
          </div>
        ))}
      </div>
      {market.executionMode !== "order_book" ? (
        <AMMCurve
          market={market}
          quoteStatus={ammQuoteStatus}
          quotes={ammQuotes}
        />
      ) : null}
    </section>
  );
}

function AMMCurve({
  market,
  quoteStatus,
  quotes,
}: {
  market: PredictionMarket;
  quoteStatus: AMMQuoteStatus;
  quotes: OrderPreview[];
}) {
  const { t } = useTranslation("prediction");
  const yesPrice = clampPercent(market.yesPricePoints);
  const noPrice = clampPercent(100 - yesPrice);
  const yesShares = market.ammYesShares ?? 0;
  const noShares = market.ammNoShares ?? 0;
  const reserveTotal = Math.max(0, yesShares) + Math.max(0, noShares);
  const hasReserveData = reserveTotal > 0;
  const yesReserveShare = hasReserveData
    ? clampPercent((Math.max(0, yesShares) / reserveTotal) * 100)
    : 50;
  const noReserveShare = 100 - yesReserveShare;
  const curveK = market.ammLiquidityParam ?? 0;
  const subsidy = market.ammSubsidyPoints ?? 0;

  return (
    <div className={AMM_CURVE_CLASS}>
      <div className={AMM_CURVE_ROW_CLASS}>
        <div className={AMM_CURVE_HEAD_CLASS}>
          <span className={AMM_CURVE_LABEL_CLASS}>
            {t("AMM_PRICE_MARKER", "Price marker")}
          </span>
          <span className={AMM_CURVE_VALUE_CLASS}>
            {t("YES_PRICE_VALUE", "YES {{price}}¢", {
              price: Math.round(yesPrice),
            })}
          </span>
        </div>
        <div className={AMM_CURVE_TRACK_CLASS} aria-hidden="true">
          <div
            className={AMM_CURVE_YES_FILL_CLASS}
            style={{ width: `${yesPrice}%` }}
          />
          <div
            className={AMM_CURVE_NO_FILL_CLASS}
            style={{ width: `${noPrice}%` }}
          />
          <span
            className={AMM_CURVE_MARKER_CLASS}
            style={{ left: `${yesPrice}%` }}
          />
        </div>
        <div className={AMM_CURVE_AXIS_CLASS}>
          <span>0¢</span>
          <span>100¢</span>
        </div>
      </div>

      <div className={AMM_CURVE_ROW_CLASS}>
        <div className={AMM_CURVE_HEAD_CLASS}>
          <span className={AMM_CURVE_LABEL_CLASS}>
            {t("AMM_RESERVE_BALANCE", "Reserve balance")}
          </span>
          <span className={AMM_CURVE_VALUE_CLASS}>
            {hasReserveData
              ? t("AMM_RESERVE_SPLIT", "YES {{yes}} / NO {{no}}", {
                  yes: formatAMMShareCount(yesShares),
                  no: formatAMMShareCount(noShares),
                })
              : t("AMM_RESERVES_UNAVAILABLE", "Reserves unavailable")}
          </span>
        </div>
        <div className={AMM_RESERVE_TRACK_CLASS} aria-hidden="true">
          <div
            className={AMM_RESERVE_YES_CLASS}
            style={{ width: `${yesReserveShare}%` }}
          />
          <div
            className={AMM_RESERVE_NO_CLASS}
            style={{ width: `${noReserveShare}%` }}
          />
        </div>
      </div>

      <div className={LIQUIDITY_GRID_CLASS}>
        <div className={LIQUIDITY_METRIC_CLASS}>
          <div className={LIQUIDITY_METRIC_LABEL_CLASS}>
            {t("YES_RESERVE", "YES reserve")}
          </div>
          <div className={LIQUIDITY_METRIC_VALUE_CLASS}>
            {formatAMMShareCount(yesShares)}
          </div>
        </div>
        <div className={LIQUIDITY_METRIC_CLASS}>
          <div className={LIQUIDITY_METRIC_LABEL_CLASS}>
            {t("NO_RESERVE", "NO reserve")}
          </div>
          <div className={LIQUIDITY_METRIC_VALUE_CLASS}>
            {formatAMMShareCount(noShares)}
          </div>
        </div>
        <div className={LIQUIDITY_METRIC_CLASS}>
          <div className={LIQUIDITY_METRIC_LABEL_CLASS}>
            {t("AMM_SUBSIDY", "AMM subsidy")}
          </div>
          <div className={LIQUIDITY_METRIC_VALUE_CLASS}>
            {subsidy > 0 ? formatCompactPoints(subsidy) : "—"}
          </div>
        </div>
        <div className={LIQUIDITY_METRIC_CLASS}>
          <div className={LIQUIDITY_METRIC_LABEL_CLASS}>
            {t("CURVE_K", "Curve K")}
          </div>
          <div className={LIQUIDITY_METRIC_VALUE_CLASS}>
            {curveK > 0
              ? curveK.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              : "—"}
          </div>
        </div>
      </div>

      <div className={AMM_CURVE_ROW_CLASS}>
        <div className={AMM_CURVE_HEAD_CLASS}>
          <span className={AMM_CURVE_LABEL_CLASS}>
            {t("AMM_IMPACT_QUOTES", "Impact quotes")}
          </span>
          <span className={AMM_CURVE_VALUE_CLASS}>
            {quoteStatus === "loading"
              ? t("LOADING")
              : quoteStatus === "ready"
                ? t("PREVIEW_BACKED", "Preview-backed")
                : t("QUOTE_UNAVAILABLE", "Quote unavailable")}
          </span>
        </div>
        {quoteStatus === "ready" && quotes.length > 0 ? (
          <div className={AMM_QUOTE_LIST_CLASS}>
            {quotes.map((quote) => {
              const afterPrice =
                quote.side === "no"
                  ? quote.newNoPricePoints
                  : quote.newYesPricePoints;
              const impact = Math.max(0, afterPrice - quote.pricePoints);
              const totalCost =
                quote.totalCostWithFeesPoints ?? quote.totalCostPoints;
              const avgPrice =
                quote.averageFillPricePoints || quote.pricePoints;
              return (
                <div key={quote.quantity} className={AMM_QUOTE_ROW_CLASS}>
                  <span className={AMM_QUOTE_LABEL_CLASS}>
                    {t("BUY_YES_QUANTITY", "Buy {{quantity}} YES", {
                      quantity: quote.quantity,
                    })}
                  </span>
                  <span className={AMM_QUOTE_VALUE_CLASS}>
                    {formatCompactPoints(totalCost)}
                  </span>
                  <span className={AMM_QUOTE_VALUE_CLASS}>
                    {t("AMM_AFTER_IMPACT", "{{avg}}¢ avg -> {{after}}¢", {
                      avg: avgPrice,
                      after: afterPrice,
                      impact,
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={LIQUIDITY_COPY_CLASS}>
            {quoteStatus === "loading"
              ? t("AMM_QUOTES_LOADING", "Loading preview-backed impact quotes.")
              : t(
                  "AMM_QUOTES_UNAVAILABLE",
                  "Preview-backed impact quotes are unavailable right now.",
                )}
          </p>
        )}
      </div>
    </div>
  );
}

export default function MarketDetailPage() {
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
  const params = useParams() ?? {};
  const ticker = (params.ticker as string | undefined) ?? "";
  // MarketCard's YES/NO pills deep-link here with `?side=yes` or
  // `?side=no` so the ticket opens preselected on that side.
  const search = useSearchParams();
  const sideParam = search?.get("side");
  const initialSide: OrderSide = sideParam === "no" ? "no" : "yes";
  const amountParam = Number(search?.get("amount"));
  const initialAmount =
    Number.isFinite(amountParam) && amountParam >= 1
      ? Math.round(amountParam)
      : 100;

  const [market, setMarket] = useState<PredictionMarket | null>(null);
  const [event, setEvent] = useState<PredictionEvent | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [related, setRelated] = useState<PredictionMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Real /orderbook fetch (only populated when executionMode='order_book').
  // AMM markets render an explicit curve-liquidity snapshot instead.
  const [orderBook, setOrderBook] = useState<ApiOrderBook | null>(null);
  const [orderBookStatus, setOrderBookStatus] =
    useState<OrderBookStatus>("idle");
  const [ammQuotes, setAmmQuotes] = useState<OrderPreview[]>([]);
  const [ammQuoteStatus, setAmmQuoteStatus] = useState<AMMQuoteStatus>("idle");
  // User's positions on THIS market — drives the Sell tab. Empty array when
  // signed out (no positions) or before /portfolio responds. Without this,
  // TradeTicket received availableYes/NoShares = 0 and the Sell button was
  // permanently disabled even for users holding hundreds of contracts.
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedSide, setSelectedSide] = useState<OrderSide>(initialSide);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const balance = useAppSelector(selectCurrentBalance);
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const loadMarket = useCallback(async () => {
    const m = await api.getMarket(ticker);
    setMarket(m);
    return m;
  }, [ticker]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const m = await loadMarket();
        if (cancelled) return;
        try {
          const ev = await api.getEvent(m.eventId);
          if (!cancelled) setEvent(ev);
        } catch (err: unknown) {
          logger.warn("MarketDetail", "event fetch failed", err);
        }
        try {
          const t = await api.getMarketTrades(m.id, 20);
          if (!cancelled) setTrades(t);
        } catch (err: unknown) {
          logger.warn("MarketDetail", "trades fetch failed", err);
        }
        try {
          const cats = await api.getCategories();
          if (!cancelled) setCategories(cats);
        } catch (err: unknown) {
          logger.warn("MarketDetail", "categories fetch failed", err);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load market",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [loadMarket]);

  // Prefer markets genuinely related to this one: same event first, then
  // recurring series, then category, with a general fallback only to avoid an
  // empty sidebar on sparse seed data.
  useEffect(() => {
    let cancelled = false;
    if (!market) return;
    const currentMarketId = market.id;
    const currentEventId = market.eventId;

    async function loadRelated() {
      const picks: PredictionMarket[] = [];
      const seen = new Set([currentMarketId]);
      async function addRelated(params: {
        eventId?: string;
        seriesId?: string;
        categoryId?: string;
      }) {
        if (picks.length >= 4) return;
        const res = await api.getMarkets({
          ...params,
          status: "open",
          pageSize: 8,
        });
        for (const candidate of res.data || []) {
          if (seen.has(candidate.id)) continue;
          seen.add(candidate.id);
          picks.push(candidate);
          if (picks.length >= 4) break;
        }
      }

      try {
        await addRelated({ eventId: currentEventId });
        if (event?.seriesId) {
          await addRelated({ seriesId: event.seriesId });
        }
        if (event?.categoryId) {
          await addRelated({ categoryId: event.categoryId });
        }
        await addRelated({});
        if (!cancelled) setRelated(picks);
      } catch (err: unknown) {
        logger.warn("MarketDetail", "related fetch failed", err);
      }
    }

    loadRelated();
    return () => {
      cancelled = true;
    };
  }, [event?.categoryId, event?.seriesId, market?.eventId, market?.id]);

  // Fetch the user's positions filtered to this market so the Sell tab can
  // show actual available share counts. Refreshes when the market id or
  // auth state changes; refetched after a successful submit (see handleSubmit
  // below) so the count reflects the new fill.
  const loadPositions = useCallback(async () => {
    if (!isAuthenticated || !market) {
      setPositions([]);
      return;
    }
    try {
      const all = await api.getPositions();
      const onThisMarket = (all || []).filter((p) => p.marketId === market.id);
      setPositions(onThisMarket);
    } catch (err: unknown) {
      logger.warn("MarketDetail", "positions fetch failed", err);
      setPositions([]);
    }
  }, [isAuthenticated, market]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  // Live price updates via the gateway's `market:<id>` channel. Gateway
  // publishes the post-AMM market state after every successful order on
  // this market. Payload shape mirrors the gateway's marketUpdatePayload
  // (see go-platform internal/http/prediction_handlers.go) — a few price
  // and volume fields plus a `ts` RFC3339 timestamp.
  //
  // The latestTsRef guards against last-write-wins clobbering: an
  // out-of-order frame, or a stale frame arriving after a fresh
  // loadMarket() refetch (e.g. post-submit at line ~210), would otherwise
  // overwrite newer state. We compare timestamps and skip older payloads.
  // If the WS drops, predict-ws.ts handles reconnect + re-subscribe.
  const latestTsRef = useRef<string>("");
  // LC-38: holds the idempotency key + order signature of an order whose
  // outcome is not yet confirmed, so a manual re-submit after a dropped
  // response reuses the key (gateway dedupes) instead of double-executing.
  const pendingIdemRef = useRef<PendingIdempotency | null>(null);
  useEffect(() => {
    const id = market?.id;
    if (!id || authLoading || !isAuthenticated) return;
    // Reset the ts watermark each time we resubscribe — a new market id
    // means the timeline restarts.
    latestTsRef.current = "";
    const unsubscribe = subscribePredictWs(`market:${id}`, (_eventId, data) => {
      const payload = data as
        | (Partial<PredictionMarket> & { ts?: string })
        | null;
      if (!payload || typeof payload !== "object") return;
      // RFC3339 timestamps compare lexicographically in time order, so a
      // string compare is sufficient — no Date parsing needed.
      if (payload.ts && payload.ts <= latestTsRef.current) return;
      if (payload.ts) latestTsRef.current = payload.ts;
      // Strip ts before merging so it doesn't drift onto state (it's not
      // part of the canonical PredictionMarket shape).
      const { ts: _ts, ...marketFields } = payload;
      const normalizedMarketFields = normalizeMarketUpdateFields(marketFields);
      setMarket((prev) =>
        prev ? { ...prev, ...normalizedMarketFields } : prev,
      );
    });
    return unsubscribe;
  }, [market?.id, authLoading, isAuthenticated]);

  // Real /orderbook fetch + WS refresh for exchange-mode markets. AMM markets
  // skip this entirely and render their AMM liquidity snapshot.
  useEffect(() => {
    const id = market?.id;
    if (!id) return;
    if (market?.executionMode !== "order_book") {
      setOrderBook(null);
      setOrderBookStatus("idle");
      return;
    }
    let cancelled = false;
    setOrderBook(null);
    setOrderBookStatus("loading");
    const fetchBook = async () => {
      try {
        const book = await api.getOrderBook(id, 20);
        if (!cancelled) {
          setOrderBook(book);
          setOrderBookStatus("ready");
        }
      } catch (err: unknown) {
        logger.warn("MarketDetail", "orderbook fetch failed", err);
        if (!cancelled) {
          setOrderBook(null);
          setOrderBookStatus("error");
        }
      }
    };
    fetchBook();
    if (authLoading || !isAuthenticated) {
      return () => {
        cancelled = true;
      };
    }
    const unsubscribe = subscribePredictWs(`orderbook:${id}`, () => {
      // Hint payload carries best bid/ask but the OrderBook component
      // wants full depth; refetch on every hint.
      if (!cancelled) fetchBook();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [market?.id, market?.executionMode, authLoading, isAuthenticated]);

  useEffect(() => {
    const id = market?.id;
    if (
      !id ||
      market?.executionMode === "order_book" ||
      market.status !== "open"
    ) {
      setAmmQuotes([]);
      setAmmQuoteStatus("idle");
      return;
    }
    let cancelled = false;
    setAmmQuotes([]);
    setAmmQuoteStatus("loading");
    Promise.all(
      AMM_QUOTE_SIZES.map((quantity) =>
        api.previewOrder({
          marketId: id,
          side: "yes",
          action: "buy",
          orderType: "market",
          quantity,
        }),
      ),
    )
      .then((quotes) => {
        if (!cancelled) {
          setAmmQuotes(quotes);
          setAmmQuoteStatus("ready");
        }
      })
      .catch((err: unknown) => {
        logger.warn("MarketDetail", "AMM quote preview failed", err);
        if (!cancelled) {
          setAmmQuotes([]);
          setAmmQuoteStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [market?.executionMode, market?.id, market?.status]);

  const handlePreview = useCallback(
    async (
      side: OrderSide,
      quantity: number,
      opts?: TradeTicketSubmitOptions,
    ): Promise<OrderPreview | null> => {
      if (!market || authLoading || !isAuthenticated) return null;
      try {
        return await api.previewOrder({
          marketId: market.id,
          side,
          action: opts?.action ?? "buy",
          orderType: opts?.orderType ?? "market",
          quantity,
          pricePoints: opts?.pricePoints,
          timeInForce: opts?.timeInForce,
          postOnly: opts?.postOnly,
          notionalCapPoints: opts?.notionalCapPoints,
        });
      } catch (err: unknown) {
        logger.warn("MarketDetail", "preview failed", err);
        return null;
      }
    },
    [authLoading, isAuthenticated, market],
  );

  const handleSubmit = useCallback(
    async (
      side: OrderSide,
      quantity: number,
      opts?: TradeTicketSubmitOptions,
    ) => {
      if (!market) return;
      // AMM-mode default: market buy. Exchange-mode markets pass opts that
      // carry order type, action (buy/sell), limit price, TIF, and notional
      // cap. Forward straight through to the gateway. Return the response
      // so TradeTicket can show a truthful toast (filled vs. rested vs.
      // cancelled) instead of guessing from the requested quantity.
      const orderReq = {
        marketId: market.id,
        side,
        action: opts?.action ?? "buy",
        orderType: opts?.orderType ?? "market",
        quantity,
        pricePoints: opts?.pricePoints,
        timeInForce: opts?.timeInForce,
        postOnly: opts?.postOnly,
        notionalCapPoints: opts?.notionalCapPoints,
      };
      // LC-38: attach a stable idempotency key. A manual re-submit after a
      // dropped network response (same order params, outcome unconfirmed)
      // reuses the key so the gateway replays the original order and the
      // wallet is debited once — instead of the gateway minting a fresh
      // per-request key and double-executing.
      const sig = orderSignature(orderReq);
      const { key, pending } = resolveIdempotencyKey(
        pendingIdemRef.current,
        sig,
        () => crypto.randomUUID(),
      );
      pendingIdemRef.current = pending;
      const response = await api.placeOrder({
        ...orderReq,
        idempotencyKey: key,
      });
      // The gateway accepted the order here (placeOrder resolved). Clear the
      // pending key so a later identical order is a NEW order, not a replay.
      // A throw above leaves the ref set, so the next manual retry of the
      // same order reuses the key and is deduped.
      pendingIdemRef.current = null;
      try {
        const updated = await loadMarket();
        try {
          const t = await api.getMarketTrades(updated.id, 20);
          setTrades(t);
        } catch (err: unknown) {
          logger.warn("MarketDetail", "post-trade trades refresh failed", err);
        }
        // Refresh the order book too — a successful order on an exchange
        // market changes the depth even when the order rests (no fill).
        if (updated.executionMode === "order_book") {
          try {
            setOrderBookStatus("loading");
            const book = await api.getOrderBook(updated.id, 20);
            setOrderBook(book);
            setOrderBookStatus("ready");
          } catch (err: unknown) {
            logger.warn("MarketDetail", "post-trade book refresh failed", err);
            setOrderBook(null);
            setOrderBookStatus("error");
          }
        }
        // Refresh positions so the Sell tab's available-shares count
        // reflects the new fill (or the new reservation, for a resting
        // limit order). Without this the count is stale until the next
        // navigation.
        await loadPositions();
        // Refresh the point-balance slice's currentBalance so the top-nav BAL
        // pill matches the post-trade ledger. Without this, the pill is
        // stale until the next page navigation triggers TopBar's onMount
        // fetch.
        if (user?.id) {
          try {
            const bal = await getBalance(user.id);
            dispatch(setCurrentBalance(bal.availableBalance));
          } catch (err: unknown) {
            logger.warn(
              "MarketDetail",
              "post-trade balance refresh failed",
              err,
            );
          }
        }
      } catch (err: unknown) {
        logger.error("MarketDetail", "post-trade market refresh failed", err);
      }
      return response;
    },
    [market, loadMarket, loadPositions, user?.id, dispatch],
  );

  const category = useMemo(() => {
    if (!market || !event) return undefined;
    return categories.find((c) => c.id === event.categoryId);
  }, [market, event, categories]);
  const displayMarket = market ? localizedMarket(contentT, market) : null;
  const displayCategory = category ? categoryName(contentT, category) : "";
  // Humanized settlement source ("feed:fifa" → "fifa") for the rules
  // list and the settlement timeline — same treatment the ticket uses.
  const rawSettlementSource = (market?.settlementSourceKey || "")
    .replace(/^(feed|source):/i, "")
    .replace(/[-_:]+/g, " ")
    .trim();
  const settlementSourceLabel = /^(admin\s*)?manual$/i.test(
    rawSettlementSource,
  )
    ? t("MANUAL_REVIEW", "manual review")
    : rawSettlementSource;
  const canPreviewOrders = isAuthenticated && !authLoading;

  async function handleShareMarket() {
    if (!market || !displayMarket) return;
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : `/market/${market.ticker}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: displayMarket.title,
          text: displayMarket.description || displayMarket.title,
          url,
        });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setShareMessage(t("SHARE_COPIED", "Market link copied."));
    } catch (err) {
      logger.warn("MarketDetail", "share failed", err);
      setShareMessage(t("SHARE_FAILED", "Share could not be opened."));
    }
  }

  if (loading) {
    return (
      <PageState loadingLabel={t("LOADING")}>{t("LOADING_MARKET")}</PageState>
    );
  }
  if (error || !market) {
    return (
      <PageState
        actionLabel={t("BACK_TO_MARKETS")}
        errorLabel={t("MARKET_UNAVAILABLE")}
        errorTitle={t("MARKET_OPEN_ERROR")}
        tone="error"
      >
        {error || t("MARKET_NOT_FOUND")}
      </PageState>
    );
  }

  return (
    <div className={MARKET_WRAP_CLASS}>
      <nav className={MARKET_CRUMB_CLASS} aria-label="Breadcrumb">
        <Link href="/predict" className={MARKET_CRUMB_LINK_CLASS}>
          {t("MARKETS_TITLE")}
        </Link>
        {category && (
          <>
            <span className={MARKET_CRUMB_SEP_CLASS}>›</span>
            <Link
              href={`/category/${category.slug}`}
              className={MARKET_CRUMB_LINK_CLASS}
            >
              {displayCategory}
            </Link>
          </>
        )}
        <span className={MARKET_CRUMB_SEP_CLASS}>›</span>
        <span>{displayMarket?.title}</span>
      </nav>

      <div className={MARKET_GRID_CLASS}>
        <div className={MARKET_MAIN_CLASS}>
          <section className={MARKET_HERO_CLASS}>
            <MarketHead
              market={displayMarket ?? market}
              categoryName={displayCategory}
            />
            <MarketChart
              ticker={market.ticker}
              side={selectedSide}
              yesPricePoints={market.yesPricePoints}
              noPricePoints={market.noPricePoints}
            />
          </section>

          {/* Liquidity honesty (2026-06 audit locks): real depth or the
            explicit AMM snapshot stays available, but collapsed — the P9.2
            minimal page leads with price + trade, depth is on demand. */}
          {isAuthenticated && (
            <details className={MARKET_DEPTH_DISCLOSURE_CLASS}>
              <summary className={MARKET_DEPTH_SUMMARY_CLASS}>
                {t("MARKET_DEPTH_AND_TRADES", "Market depth & recent trades")}
              </summary>
              <div className={MARKET_DATA_ROW_CLASS}>
                <MarketDepth
                  ammQuoteStatus={ammQuoteStatus}
                  ammQuotes={ammQuotes}
                  market={market}
                  orderBook={orderBook}
                  orderBookStatus={orderBookStatus}
                />
                <RecentTrades trades={trades} />
              </div>
            </details>
          )}

          <section className={MARKET_DETAILS_CLASS}>
            <h3 className={MARKET_DETAILS_TITLE_CLASS}>
              {t("MARKET_DETAILS_RESOLUTION")}
            </h3>
            {displayMarket?.description && (
              <p className={MARKET_DETAILS_COPY_CLASS}>
                {displayMarket.description}
              </p>
            )}
            <ul className={MARKET_RULES_CLASS}>
              <li className={MARKET_RULE_CLASS}>
                {isOpenMarketStatus(market.status)
                  ? t("CLOSES_AT_UTC", {
                      date: new Date(market.closeAt).toUTCString().slice(5, -4),
                    })
                  : t("MARKET_CURRENT_STATUS", {
                      status: marketStatusLabel(market.status, t),
                    })}
              </li>
              {settlementSourceLabel && (
                <li className={MARKET_RULE_CLASS}>
                  {t("RESOLVES_BY", { source: settlementSourceLabel })}
                </li>
              )}
            </ul>

            {/* Settlement timeline (P10): when the market closes, who
                decides, and when points move — set at the moment users
                read the rules, not discovered after the fact. */}
            <ol className="mt-4 grid list-none grid-cols-4 gap-2 border-t border-[var(--border-1)] p-0 pt-4 max-[640px]:grid-cols-2">
              {[
                {
                  label: t("TIMELINE_TRADING", "Trading"),
                  value: isOpenMarketStatus(market.status)
                    ? t("TIMELINE_OPEN_NOW", "Open now")
                    : marketStatusLabel(market.status, t),
                },
                {
                  label: t("TIMELINE_CLOSES", "Closes"),
                  value: new Date(market.closeAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                },
                {
                  label: t("TIMELINE_RESOLVES", "Resolves"),
                  value:
                    settlementSourceLabel ||
                    t("TIMELINE_RESOLUTION_REVIEW", "By listed rules"),
                },
                {
                  label: t("TIMELINE_SETTLES", "Points settle"),
                  value:
                    market.status === "settled"
                      ? t("TIMELINE_SETTLED", "Settled")
                      : t(
                          "TIMELINE_AFTER_RESOLUTION",
                          "Shortly after resolution",
                        ),
                },
              ].map((step) => (
                <li key={step.label} className="min-w-0">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--t3)]">
                    <span
                      className="h-1.5 w-1.5 bg-[var(--brand-dot)]"
                      aria-hidden="true"
                    />
                    {step.label}
                  </div>
                  <div
                    className="truncate text-[13px] font-medium text-[var(--t1)]"
                    title={step.value}
                  >
                    {step.value}
                  </div>
                </li>
              ))}
            </ol>
            <div className={MARKET_SHARE_ROW_CLASS}>
              <button
                type="button"
                className={MARKET_SHARE_BUTTON_CLASS}
                onClick={handleShareMarket}
              >
                {t("SHARE_MARKET", "Share market")}
              </button>
              {shareMessage && (
                <span className={MARKET_SHARE_STATUS_CLASS}>
                  {shareMessage}
                </span>
              )}
            </div>
          </section>

          <MarketDiscussion
            marketId={market.id}
            isAuthenticated={isAuthenticated}
            authLoading={authLoading}
          />

          <aside
            className={RELATED_CARD_CLASS}
            aria-label={t("RELATED_MARKETS")}
          >
            <h3 className={RELATED_TITLE_CLASS}>{t("RELATED_MARKETS")}</h3>
            {related.length === 0 ? (
              <p className={RELATED_EMPTY_CLASS}>{t("NO_RELATED_MARKETS")}</p>
            ) : (
              <div className={RELATED_LIST_CLASS}>
                {related.map((market) => {
                  const m = localizedMarket(contentT, market);
                  return (
                    <Link
                      key={m.id}
                      href={`/market/${m.ticker}`}
                      className={RELATED_ROW_CLASS}
                    >
                      <div className={RELATED_QUESTION_CLASS}>{m.title}</div>
                      <div className={RELATED_LINE_CLASS}>
                        <span className={RELATED_YES_CLASS}>
                          {t("YES")} {m.yesPricePoints}¢
                        </span>
                        <span>
                          {t("VOLUME_VALUE", {
                            value: formatCompactPoints(m.volumePoints),
                          })}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </aside>
        </div>

        <aside className={MARKET_SIDE_CLASS}>
          <div className={MARKET_TICKET_STICKY_CLASS}>
            <TradeTicket
              market={market}
              balance={typeof balance === "number" ? balance : undefined}
              defaultSide={initialSide}
              defaultAmount={initialAmount}
              onSideChange={setSelectedSide}
              isAuthenticated={isAuthenticated}
              authLoading={authLoading}
              // Available = quantity minus reserved (already-spoken-for in
              // open sell orders). Sum across positions on this side; in
              // practice the gateway returns at most one row per (user,
              // market, side) but defensively reduce in case that changes.
              availableYesShares={positions
                .filter((p) => p.side === "yes")
                .reduce(
                  (sum, p) =>
                    sum + Math.max(0, p.quantity - (p.reservedQuantity || 0)),
                  0,
                )}
              availableNoShares={positions
                .filter((p) => p.side === "no")
                .reduce(
                  (sum, p) =>
                    sum + Math.max(0, p.quantity - (p.reservedQuantity || 0)),
                  0,
                )}
              onPreview={canPreviewOrders ? handlePreview : undefined}
              onSubmit={handleSubmit}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function PageState({
  children,
  actionLabel,
  errorLabel,
  errorTitle,
  loadingLabel,
  tone = "muted",
}: {
  children: React.ReactNode;
  actionLabel?: string;
  errorLabel?: string;
  errorTitle?: string;
  loadingLabel?: string;
  tone?: "muted" | "error";
}) {
  const isError = tone === "error";

  return (
    <div className={PAGE_STATE_WRAP_CLASS}>
      <section className={PAGE_STATE_CARD_CLASS} aria-live="polite">
        <div className={pageStateEyebrowClass(isError)}>
          {isError ? errorLabel : loadingLabel}
        </div>
        <h1 className={PAGE_STATE_TITLE_CLASS}>
          {isError ? errorTitle : children}
        </h1>
        {isError && (
          <>
            <p className={PAGE_STATE_COPY_CLASS}>{children}</p>
            <Link href="/predict" className={PAGE_STATE_ACTION_CLASS}>
              {actionLabel}
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
