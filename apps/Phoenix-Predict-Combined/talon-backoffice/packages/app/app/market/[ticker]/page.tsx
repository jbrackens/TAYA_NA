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
 * endpoints are untouched. Order book levels are synthesized from the
 * current mid + liquidity until the gateway exposes /orderbook
 * (shape-only, so swapping in real levels later is a drop-in).
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import MarketHead from "../../components/prediction/MarketHead";
import MarketChart from "../../components/prediction/MarketChart";
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
} from "../../lib/store/cashierSlice";
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
} from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import {
  orderSignature,
  resolveIdempotencyKey,
  type PendingIdempotency,
} from "../../lib/orderIdempotency";
import {
  categoryName,
  localizedMarket,
} from "../../components/prediction/market-content";

const api = createPredictionClient();

const GLASS_SURFACE_CLASS =
  "relative border border-white/[0.13] bg-[color:var(--glass-regular)] bg-[image:linear-gradient(180deg,_rgba(255,255,255,0.14)_0%,_rgba(255,255,255,0.05)_30%,_rgba(255,255,255,0.025)_100%)] shadow-[inset_0_1px_0_var(--rim-top),inset_0_-1px_0_var(--rim-bottom),inset_1px_0_2px_var(--chroma-1),inset_-1px_0_2px_var(--chroma-2),0_2px_6px_rgba(0,0,0,0.18),0_8px_24px_rgba(0,0,0,0.28),0_16px_48px_rgba(0,0,0,0.2)] backdrop-blur-[30px] backdrop-saturate-[180%] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:rounded-[inherit] before:bg-[image:linear-gradient(180deg,_rgba(255,255,255,0.06)_0%,_transparent_100%)] before:mix-blend-overlay before:content-['']";
const MARKET_WRAP_CLASS = "text-[var(--t1)]";
const MARKET_CRUMB_CLASS =
  "mb-[18px] flex flex-wrap items-center gap-2 text-[13px] text-[var(--t3)]";
const MARKET_CRUMB_LINK_CLASS =
  "text-[var(--t2)] no-underline hover:text-[var(--t1)]";
const MARKET_CRUMB_SEP_CLASS = "opacity-50";
const MARKET_GRID_CLASS =
  "grid grid-cols-[minmax(0,_1fr)_360px] gap-6 max-[1100px]:grid-cols-1";
const MARKET_MAIN_CLASS =
  "flex min-w-0 flex-col gap-6 max-[1100px]:contents";
const MARKET_SIDE_CLASS =
  "flex min-w-0 flex-col gap-6 max-[1100px]:contents";
const MARKET_TICKET_STICKY_CLASS =
  "sticky top-[84px] max-[1100px]:static max-[1100px]:top-auto max-[1100px]:order-2";
const MARKET_DATA_ROW_CLASS =
  "grid grid-cols-2 gap-6 max-[1100px]:order-3 max-[720px]:grid-cols-1";
const MARKET_HERO_CLASS =
  "overflow-hidden rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] max-[1100px]:order-1 [&>section:first-child]:mb-0 [&>section:first-child]:rounded-none [&>section:first-child]:border-0 [&>section:first-child]:bg-transparent [&>section:first-child]:px-7 [&>section:first-child]:pt-5 [&>section:first-child]:pb-0 [&>section:nth-child(2)]:rounded-none [&>section:nth-child(2)]:border-0 [&>section:nth-child(2)]:bg-transparent [&>section:nth-child(2)]:px-7 [&>section:nth-child(2)]:pt-3 [&>section:nth-child(2)]:pb-5 [&>section:nth-child(2)_svg]:h-[280px] max-[720px]:[&>section:first-child]:px-5 max-[720px]:[&>section:first-child]:pt-[18px] max-[720px]:[&>section:nth-child(2)]:px-5 max-[720px]:[&>section:nth-child(2)]:pt-2.5 max-[720px]:[&>section:nth-child(2)]:pb-4 max-[720px]:[&>section:nth-child(2)_svg]:h-[220px]";
const MARKET_DETAILS_CLASS =
  "rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] px-7 py-6 font-['Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif] max-[1100px]:order-4";
const MARKET_DETAILS_TITLE_CLASS =
  "mb-3 text-base font-semibold tracking-[-0.01em] text-[var(--t1)]";
const MARKET_DETAILS_COPY_CLASS =
  "mb-2.5 text-sm leading-[1.6] text-[var(--t2)]";
const MARKET_RULES_CLASS =
  "mt-[14px] flex list-none flex-col gap-2 border-t border-[var(--border-1)] p-0 pt-[14px]";
const MARKET_RULE_CLASS =
  "relative pl-[18px] text-[13px] leading-[1.5] text-[var(--t2)] before:absolute before:left-1 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-[var(--accent)] before:content-['']";
const RELATED_CARD_CLASS =
  "rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-5 font-['Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif] max-[1100px]:order-5";
const RELATED_TITLE_CLASS =
  "mb-[14px] border-b border-[var(--border-1)] pb-3 text-sm font-semibold tracking-[-0.01em] text-[var(--t1)]";
const RELATED_EMPTY_CLASS = "text-xs text-[var(--t3)]";
const RELATED_LIST_CLASS = "flex flex-col";
const RELATED_ROW_CLASS =
  "group block border-t border-[var(--border-1)] py-3 no-underline first:border-t-0 first:pt-0 last:pb-0";
const RELATED_QUESTION_CLASS =
  "mb-1.5 text-[13px] font-medium leading-[1.35] text-[var(--t1)] group-hover:text-[var(--accent)]";
const RELATED_LINE_CLASS =
  "flex items-center justify-between font-['IBM_Plex_Mono',_monospace] text-[11px] text-[var(--t3)] [font-variant-numeric:tabular-nums]";
const RELATED_YES_CLASS = "font-semibold text-[var(--yes-text)]";
const PAGE_STATE_WRAP_CLASS = "grid min-h-[60vh] place-items-center px-4 py-8";
const PAGE_STATE_CARD_CLASS = `${GLASS_SURFACE_CLASS} w-[min(100%,440px)] rounded-[var(--r-lg)] p-7 text-center text-[var(--t1)]`;
const PAGE_STATE_EYEBROW_BASE_CLASS =
  "mb-[14px] inline-flex min-h-7 items-center justify-center rounded-[var(--r-pill)] border px-3 text-[11px] font-bold uppercase tracking-[0.12em]";
const PAGE_STATE_TITLE_CLASS =
  "m-0 text-[22px] font-extrabold tracking-[-0.01em]";
const PAGE_STATE_COPY_CLASS = "mt-2.5 mb-0 text-sm leading-[1.5] text-[var(--t2)]";
const PAGE_STATE_ACTION_CLASS =
  "mt-[22px] inline-flex min-h-11 items-center justify-center rounded-[var(--r-md)] border border-[rgba(43,228,128,0.6)] bg-[image:linear-gradient(180deg,_rgba(255,255,255,0.25)_0%,_rgba(255,255,255,0)_50%),linear-gradient(115deg,_#2be480_0%,_#00ffaa_100%)] px-5 text-sm font-bold text-[#04140a] no-underline shadow-[inset_0_1px_0_rgba(255,255,255,0.5),_0_10px_28px_rgba(43,228,128,0.18)] transition-[transform,filter] duration-[180ms] ease-[ease] hover:-translate-y-px hover:brightness-[1.05]";

function pageStateEyebrowClass(isError: boolean): string {
  return `${PAGE_STATE_EYEBROW_BASE_CLASS} ${
    isError
      ? "border-[rgba(255,155,107,0.28)] bg-[rgba(255,155,107,0.08)] text-[var(--no)]"
      : "border-[rgba(43,228,128,0.28)] bg-[rgba(43,228,128,0.08)] text-[var(--accent)]"
  }`;
}

function synthesizeBook(market: PredictionMarket): {
  bids: BookLevel[];
  asks: BookLevel[];
} {
  const yesPx = market.yesPriceCents;
  const liqShares = Math.max(
    100,
    Math.round((market.liquidityCents || market.volumeCents || 200000) / 100),
  );
  const bids: BookLevel[] = [];
  let cumBid = 0;
  for (let i = 0; i < 3; i++) {
    const px = Math.max(1, yesPx - i);
    const size = Math.max(40, Math.round(liqShares * (0.28 - i * 0.06)));
    cumBid += size;
    bids.push({ priceCents: px, size, total: cumBid });
  }
  const asks: BookLevel[] = [];
  let cumAsk = 0;
  // Asks stored in the "NO priceCents" convention (the OrderBook component
  // inverts to show `NO Xc`), descending from the top of the stack.
  for (let i = 2; i >= 0; i--) {
    const px = Math.min(99, yesPx + i + 1);
    const size = Math.max(40, Math.round(liqShares * (0.26 - i * 0.05)));
    cumAsk += size;
    asks.push({ priceCents: px, size, total: cumAsk });
  }
  return { bids, asks };
}

/**
 * Adapt a real /orderbook response into the legacy {bids, asks} pair the
 * OrderBook presentational component expects. The visual convention is:
 *   - bids = YES buy orders (priceCents = YES price ladder, descending)
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
    priceCents: lvl.priceCents,
    size: lvl.quantity,
    total: lvl.total,
  }));
  // Ask side: render NO bids in descending order for visual stack consistency.
  // The OrderBook component inverts these to "NO Xc" labels via its own logic.
  const asks: BookLevel[] = book.no.bids
    .slice()
    .reverse()
    .map((lvl) => ({
      priceCents: lvl.priceCents,
      size: lvl.quantity,
      total: lvl.total,
    }));
  return { bids, asks };
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
    Number.isFinite(amountParam) && amountParam >= 1 ? amountParam : 25;

  const [market, setMarket] = useState<PredictionMarket | null>(null);
  const [event, setEvent] = useState<PredictionEvent | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [related, setRelated] = useState<PredictionMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Real /orderbook fetch (only populated when executionMode='order_book').
  // null while loading or when AMM mode; falls back to synthesizeBook below.
  const [orderBook, setOrderBook] = useState<ApiOrderBook | null>(null);
  // User's positions on THIS market — drives the Sell tab. Empty array when
  // signed out (no positions) or before /portfolio responds. Without this,
  // TradeTicket received availableYes/NoShares = 0 and the Sell button was
  // permanently disabled even for users holding hundreds of contracts.
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedSide, setSelectedSide] = useState<OrderSide>(initialSide);
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

  // Load up to 4 related markets in the same category (excluding this one).
  useEffect(() => {
    let cancelled = false;
    if (!market) return;
    api
      .getMarkets({ status: "open", pageSize: 8 })
      .then((res) => {
        if (cancelled) return;
        const picks = res.data.filter((m) => m.id !== market.id).slice(0, 4);
        setRelated(picks);
      })
      .catch((err: unknown) => {
        logger.warn("MarketDetail", "related fetch failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, [market]);

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
      setMarket((prev) => (prev ? { ...prev, ...marketFields } : prev));
    });
    return unsubscribe;
  }, [market?.id, authLoading, isAuthenticated]);

  // Real /orderbook fetch + WS refresh for exchange-mode markets.
  //
  // AMM markets ignore this entirely — synthesizeBook handles them. For
  // order-book markets we fetch once on market load, then refetch on the
  // `orderbook:<id>` WS channel which carries a "stale" hint after each
  // fill (engine plan §Data Flow: one batched orderbook update per
  // request). Failures fall back to the synthesized ladder so the page
  // still renders even if /orderbook is temporarily unreachable.
  useEffect(() => {
    const id = market?.id;
    if (!id) return;
    if (market?.executionMode !== "order_book") {
      setOrderBook(null);
      return;
    }
    let cancelled = false;
    const fetchBook = async () => {
      try {
        const book = await api.getOrderBook(id, 20);
        if (!cancelled) setOrderBook(book);
      } catch (err: unknown) {
        logger.warn("MarketDetail", "orderbook fetch failed", err);
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

  const handlePreview = useCallback(
    async (
      side: OrderSide,
      quantity: number,
      opts?: TradeTicketSubmitOptions,
    ): Promise<OrderPreview | null> => {
      if (!market) return null;
      try {
        return await api.previewOrder({
          marketId: market.id,
          side,
          action: opts?.action ?? "buy",
          orderType: opts?.orderType ?? "market",
          quantity,
          priceCents: opts?.priceCents,
          timeInForce: opts?.timeInForce,
          postOnly: opts?.postOnly,
          notionalCapCents: opts?.notionalCapCents,
        });
      } catch (err: unknown) {
        logger.warn("MarketDetail", "preview failed", err);
        return null;
      }
    },
    [market],
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
        priceCents: opts?.priceCents,
        timeInForce: opts?.timeInForce,
        postOnly: opts?.postOnly,
        notionalCapCents: opts?.notionalCapCents,
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
            const book = await api.getOrderBook(updated.id, 20);
            setOrderBook(book);
          } catch (err: unknown) {
            logger.warn("MarketDetail", "post-trade book refresh failed", err);
          }
        }
        // Refresh positions so the Sell tab's available-shares count
        // reflects the new fill (or the new reservation, for a resting
        // limit order). Without this the count is stale until the next
        // navigation.
        await loadPositions();
        // Refresh the cashier slice's currentBalance so the top-nav BAL
        // pill matches the post-trade wallet. Without this, the pill is
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

  if (loading) {
    return <PageState loadingLabel={t("LOADING")}>{t("LOADING_MARKET")}</PageState>;
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

  // Real book wins when populated (exchange-mode markets); fall back to
  // synthesizeBook for AMM markets and during the initial fetch.
  const { bids, asks } = orderBook
    ? adaptBookForDisplay(orderBook)
    : synthesizeBook(market);
  const traders = new Set<string>();
  for (const trade of trades) {
    if (trade.buyerId) traders.add(trade.buyerId);
    if (trade.sellerId) traders.add(trade.sellerId);
  }
  const tradersCount = traders.size;

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
              tradersCount={tradersCount}
            />
            <MarketChart
              ticker={market.ticker}
              side={selectedSide}
              yesPriceCents={market.yesPriceCents}
              noPriceCents={market.noPriceCents}
              previousPriceCents={market.lastTradePriceCents ?? undefined}
              impliedProbability={market.yesPriceCents}
              volume24hCents={market.volumeCents}
              openInterestShares={Math.round(market.openInterestCents / 100)}
            />
          </section>

          <div className={MARKET_DATA_ROW_CLASS}>
            <OrderBook bids={bids} asks={asks} />
            <RecentTrades trades={trades} />
          </div>

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
                {t("SETTLEMENT_SOURCE", {
                  source: market.settlementSourceKey,
                })}
              </li>
              <li className={MARKET_RULE_CLASS}>
                {t("RESOLUTION_RULE", { rule: market.settlementRule })}
              </li>
              <li className={MARKET_RULE_CLASS}>
                {t("FEES_ON_FILLS", {
                  fee: (market.feeRateBps / 100).toFixed(2),
                })}
              </li>
              <li className={MARKET_RULE_CLASS}>
                {t("CLOSES_AT_UTC", {
                  date: new Date(market.closeAt).toUTCString().slice(5, -4),
                })}
              </li>
            </ul>
          </section>
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
              onPreview={handlePreview}
              onSubmit={handleSubmit}
            />
          </div>

          <aside className={RELATED_CARD_CLASS} aria-label={t("RELATED_MARKETS")}>
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
                          {t("YES")} {m.yesPriceCents}¢
                        </span>
                        <span>
                          {t("VOLUME_VALUE", {
                            value: `$${(m.volumeCents / 100).toFixed(0)}`,
                          })}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </aside>
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
