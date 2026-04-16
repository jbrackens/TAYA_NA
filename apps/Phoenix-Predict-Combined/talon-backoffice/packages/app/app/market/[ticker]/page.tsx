"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { TradeTicket } from "../../components/prediction/TradeTicket";
import type {
  PredictionMarket,
  Trade,
  OrderSide,
  OrderPreview,
} from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";

const api = createPredictionClient();

export default function MarketDetailPage() {
  // useParams() returns null during the initial static render; fall back to
  // an empty object so we can safely read `.ticker` (undefined → empty string).
  const params = useParams() ?? {};
  const ticker = (params.ticker as string | undefined) ?? "";

  const [market, setMarket] = useState<PredictionMarket | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const m = await api.getMarket(ticker);
        setMarket(m);
        const t = await api.getMarketTrades(m.id, 20);
        setTrades(t);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load market");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ticker]);

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
      // Refresh market data after trade
      const updated = await api.getMarket(ticker);
      setMarket(updated);
      const t = await api.getMarketTrades(updated.id, 20);
      setTrades(t);
    },
    [market, ticker],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 text-sm">Loading market...</div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-red-400 text-sm">
          {error || "Market not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="text-xs text-gray-500 mb-1">{market.ticker}</div>
        <h1 className="text-xl font-bold text-white mb-2">{market.title}</h1>
        {market.description && (
          <p className="text-sm text-gray-400">{market.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Market info + trades */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price display */}
          <div className="border border-gray-700 rounded-xl p-4 bg-gray-900/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-bold text-emerald-400">
                  {market.yesPriceCents}%
                </div>
                <div className="text-xs text-gray-500">YES probability</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-red-400">
                  {market.noPriceCents}%
                </div>
                <div className="text-xs text-gray-500">NO probability</div>
              </div>
            </div>
            {/* Probability bar */}
            <div className="h-3 bg-red-500/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${market.yesPriceCents}%` }}
              />
            </div>
          </div>

          {/* Market stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="border border-gray-700 rounded-lg p-3 text-center bg-gray-900/50">
              <div className="text-lg font-semibold text-white">
                ${(market.volumeCents / 100).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Volume</div>
            </div>
            <div className="border border-gray-700 rounded-lg p-3 text-center bg-gray-900/50">
              <div className="text-lg font-semibold text-white">
                ${(market.openInterestCents / 100).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Open Interest</div>
            </div>
            <div className="border border-gray-700 rounded-lg p-3 text-center bg-gray-900/50">
              <div className="text-lg font-semibold text-white">
                {new Date(market.closeAt).toLocaleDateString()}
              </div>
              <div className="text-xs text-gray-500">Closes</div>
            </div>
          </div>

          {/* Recent trades */}
          <div className="border border-gray-700 rounded-xl p-4 bg-gray-900/50">
            <h2 className="text-sm font-semibold text-white mb-3">
              Recent Trades
            </h2>
            {trades.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">
                No trades yet
              </div>
            ) : (
              <div className="space-y-2">
                {trades.slice(0, 10).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span
                      className={
                        t.side === "yes" ? "text-emerald-400" : "text-red-400"
                      }
                    >
                      {t.side.toUpperCase()} x{t.quantity}
                    </span>
                    <span className="text-gray-400">{t.priceCents}%</span>
                    <span className="text-gray-500">
                      {new Date(t.tradedAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settlement info */}
          <div className="border border-gray-700 rounded-xl p-4 bg-gray-900/50">
            <h2 className="text-sm font-semibold text-white mb-2">
              Resolution
            </h2>
            <div className="text-xs text-gray-400 space-y-1">
              <div>
                Source:{" "}
                <span className="text-gray-300">
                  {market.settlementSourceKey}
                </span>
              </div>
              <div>
                Rule:{" "}
                <span className="text-gray-300">{market.settlementRule}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Trade ticket */}
        <div>
          <TradeTicket
            market={market}
            onPreview={handlePreview}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
