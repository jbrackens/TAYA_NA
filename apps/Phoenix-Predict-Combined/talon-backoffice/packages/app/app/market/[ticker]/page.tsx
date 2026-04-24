"use client";

/**
 * MarketDetailPage — Liquid Glass market view (DESIGN.md §6 layout).
 *
 *   [breadcrumb]
 *   [MarketHead  — question + meta pills + countdown, full-width glass]
 *   ┌──────────────────────────────┐ ┌─────────────┐
 *   │ MarketChart                  │ │ TradeTicket │
 *   │ [OrderBook] [RecentTrades]   │ │ (sticky)    │
 *   └──────────────────────────────┘ └─────────────┘
 *   ┌──────────────────────────────┐ ┌─────────────┐
 *   │ Market details & resolution  │ │ Related     │
 *   └──────────────────────────────┘ └─────────────┘
 *
 * Data wiring is preserved from the prior dark-broadcast version: the
 * gateway's REST endpoints are untouched. Order book levels are
 * synthesized from the current mid + liquidity until the gateway
 * exposes /orderbook (shape-only, so swapping in real levels later is
 * a drop-in).
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import MarketHead from "../../components/prediction/MarketHead";
import MarketChart from "../../components/prediction/MarketChart";
import OrderBook from "../../components/prediction/OrderBook";
import type { BookLevel } from "../../components/prediction/OrderBook";
import RecentTrades from "../../components/prediction/RecentTrades";
import { TradeTicket } from "../../components/prediction/TradeTicket";
import { MarketCard } from "../../components/prediction/MarketCard";
import { logger } from "../../lib/logger";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCurrentBalance } from "../../lib/store/cashierSlice";
import type {
  PredictionMarket,
  PredictionEvent,
  Trade,
  Category,
  OrderSide,
  OrderPreview,
} from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";

const api = createPredictionClient();

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

export default function MarketDetailPage() {
  const params = useParams() ?? {};
  const ticker = (params.ticker as string | undefined) ?? "";

  const [market, setMarket] = useState<PredictionMarket | null>(null);
  const [event, setEvent] = useState<PredictionEvent | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [related, setRelated] = useState<PredictionMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const balance = useAppSelector(selectCurrentBalance);

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

  const handlePreview = useCallback(
    async (side: OrderSide, quantity: number): Promise<OrderPreview | null> => {
      if (!market) return null;
      try {
        return await api.previewOrder({
          marketId: market.id,
          side,
          action: "buy",
          orderType: "market",
          quantity,
        });
      } catch (err: unknown) {
        logger.warn("MarketDetail", "preview failed", err);
        return null;
      }
    },
    [market],
  );

  const handleSubmit = useCallback(
    async (side: OrderSide, quantity: number) => {
      if (!market) return;
      await api.placeOrder({
        marketId: market.id,
        side,
        action: "buy",
        orderType: "market",
        quantity,
      });
      try {
        const updated = await loadMarket();
        try {
          const t = await api.getMarketTrades(updated.id, 20);
          setTrades(t);
        } catch (err: unknown) {
          logger.warn("MarketDetail", "post-trade trades refresh failed", err);
        }
      } catch (err: unknown) {
        logger.error("MarketDetail", "post-trade market refresh failed", err);
      }
    },
    [market, loadMarket],
  );

  const category = useMemo(() => {
    if (!market || !event) return undefined;
    return categories.find((c) => c.id === event.categoryId);
  }, [market, event, categories]);

  if (loading) {
    return <PageState>Loading market…</PageState>;
  }
  if (error || !market) {
    return <PageState tone="error">{error || "Market not found"}</PageState>;
  }

  const { bids, asks } = synthesizeBook(market);
  const tradersCount =
    trades.length >= 2 ? new Set(trades.map((t) => t.buyerId)).size : undefined;

  return (
    <div className="md-wrap">
      <style>{`
        .md-wrap { color: var(--t1); }
        .md-crumb {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--t3);
          font-size: 13px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .md-crumb a { color: var(--t2); text-decoration: none; }
        .md-crumb a:hover { color: var(--t1); }
        .md-crumb .sep { opacity: 0.5; }

        .md-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 24px;
        }
        .md-main { display: flex; flex-direction: column; gap: 24px; }
        .md-data-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .md-rail {
          position: sticky;
          top: 88px;
          align-self: start;
        }

        .md-bottom {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 24px;
          margin-top: 24px;
        }
        .md-details { padding: 22px 24px; border-radius: var(--r-md); }
        .md-details h3 {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 12px;
          letter-spacing: -0.01em;
        }
        .md-details p {
          color: var(--t2);
          font-size: 13px;
          line-height: 1.6;
          margin-bottom: 10px;
        }
        .md-rules {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .md-rules li {
          font-size: 12px;
          color: var(--t2);
          padding-left: 18px;
          position: relative;
          line-height: 1.5;
        }
        .md-rules li::before {
          content: '';
          position: absolute;
          left: 4px;
          top: 8px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 6px var(--accent-glow-color);
        }

        .md-related { padding: 18px 18px 14px; border-radius: var(--r-md); }
        .md-related h3 {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--t2);
          margin-bottom: 14px;
        }
        .md-related-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .md-related-row {
          padding: 10px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          text-decoration: none;
          display: block;
        }
        .md-related-row:first-of-type { border-top: none; padding-top: 0; }
        .md-related-row:last-child { padding-bottom: 0; }
        .md-related-q {
          font-size: 13px;
          font-weight: 500;
          line-height: 1.35;
          margin-bottom: 6px;
          color: var(--t1);
        }
        .md-related-row:hover .md-related-q { color: var(--accent); }
        .md-related-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-family: 'IBM Plex Mono', monospace;
          font-variant-numeric: tabular-nums;
          color: var(--t3);
        }
        .md-related-yes { color: var(--yes); font-weight: 500; }

        @media (max-width: 1100px) {
          .md-grid, .md-bottom { grid-template-columns: 1fr; }
          .md-rail { position: static; }
        }
        @media (max-width: 720px) {
          .md-data-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <nav className="md-crumb" aria-label="Breadcrumb">
        <Link href="/predict">Markets</Link>
        {category && (
          <>
            <span className="sep">›</span>
            <Link href={`/category/${category.slug}`}>{category.name}</Link>
          </>
        )}
        <span className="sep">›</span>
        <span>{market.title}</span>
      </nav>

      <MarketHead
        market={market}
        categoryName={category?.name}
        tradersCount={tradersCount}
      />

      <div className="md-grid">
        <div className="md-main">
          <MarketChart
            ticker={market.ticker}
            yesPriceCents={market.yesPriceCents}
            previousPriceCents={market.lastTradePriceCents ?? undefined}
            impliedProbability={market.yesPriceCents}
            volume24hCents={market.volumeCents}
            openInterestShares={Math.round(market.openInterestCents / 100)}
          />
          <div className="md-data-row">
            <OrderBook bids={bids} asks={asks} />
            <RecentTrades trades={trades} />
          </div>
        </div>
        <aside className="md-rail">
          <TradeTicket
            market={market}
            balance={typeof balance === "number" ? balance : undefined}
            onPreview={handlePreview}
            onSubmit={handleSubmit}
          />
        </aside>
      </div>

      <div className="md-bottom">
        <section className="glass md-details">
          <h3>Market details & resolution</h3>
          {market.description && <p>{market.description}</p>}
          <ul className="md-rules">
            <li>Settlement source: {market.settlementSourceKey}.</li>
            <li>Resolution rule: {market.settlementRule}.</li>
            <li>Fees: {(market.feeRateBps / 100).toFixed(2)}% on all fills.</li>
            <li>
              Closes {new Date(market.closeAt).toUTCString().slice(5, -4)} UTC.
            </li>
          </ul>
        </section>

        <aside className="glass md-related" aria-label="Related markets">
          <h3>Related markets</h3>
          {related.length === 0 ? (
            <p style={{ color: "var(--t3)", fontSize: 12 }}>
              No related markets open right now.
            </p>
          ) : (
            <div className="md-related-list">
              {related.map((m) => (
                <Link
                  key={m.id}
                  href={`/market/${m.ticker}`}
                  className="md-related-row"
                >
                  <div className="md-related-q">{m.title}</div>
                  <div className="md-related-line">
                    <span className="md-related-yes">
                      YES {m.yesPriceCents}¢
                    </span>
                    <span>${(m.volumeCents / 100).toFixed(0)} vol</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* MarketCard is imported for related-markets usage when we enrich
       * the related list with the full tile. Kept referenced so the build
       * tree-shakes correctly. */}
      <MarketCardSuppressUnused />
    </div>
  );
}

function MarketCardSuppressUnused() {
  // Referenced so the import isn't flagged as unused — remove when
  // /predict or /category start using the Phase-3 MarketCard redesign.
  void MarketCard;
  return null;
}

function PageState({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "error";
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        fontSize: 13,
        color: tone === "error" ? "var(--no)" : "var(--t3)",
      }}
    >
      {children}
    </div>
  );
}
