"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  Position,
  PortfolioSummary,
  PredictionOrder,
} from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";

const api = createPredictionClient();

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<PredictionOrder[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"positions" | "orders" | "history">(
    "positions",
  );

  useEffect(() => {
    async function load() {
      try {
        const [pos, sum, ord] = await Promise.all([
          api.getPositions(),
          api.getPortfolioSummary(),
          api.getOrders({ page: 1, pageSize: 50 }),
        ]);
        setPositions(pos);
        setSummary(sum);
        setOrders(ord.data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Portfolio load failed:", msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 text-sm">Loading portfolio...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">Portfolio</h1>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="border border-gray-700 rounded-xl p-4 bg-gray-900/50">
            <div className="text-lg font-bold text-white">
              ${(summary.totalValueCents / 100).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">Invested</div>
          </div>
          <div className="border border-gray-700 rounded-xl p-4 bg-gray-900/50">
            <div
              className={`text-lg font-bold ${summary.realizedPnlCents >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {summary.realizedPnlCents >= 0 ? "+" : ""}$
              {(summary.realizedPnlCents / 100).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">Realized P&L</div>
          </div>
          <div className="border border-gray-700 rounded-xl p-4 bg-gray-900/50">
            <div className="text-lg font-bold text-white">
              {summary.openPositions}
            </div>
            <div className="text-xs text-gray-500">Open Positions</div>
          </div>
          <div className="border border-gray-700 rounded-xl p-4 bg-gray-900/50">
            <div className="text-lg font-bold text-blue-400">
              {summary.accuracyPct.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">
              Accuracy ({summary.correctPredictions}/{summary.totalPredictions})
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b border-gray-800">
        {(["positions", "orders", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "text-white border-b-2 border-blue-500"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Positions tab */}
      {tab === "positions" && (
        <div className="space-y-2">
          {positions.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              No open positions.{" "}
              <Link href="/predict" className="text-blue-400 hover:underline">
                Start predicting
              </Link>
            </div>
          ) : (
            <div className="border border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr className="text-xs text-gray-400">
                    <th className="text-left px-4 py-2">Market</th>
                    <th className="text-center px-2 py-2">Side</th>
                    <th className="text-right px-2 py-2">Qty</th>
                    <th className="text-right px-2 py-2">Avg Price</th>
                    <th className="text-right px-4 py-2">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-gray-800 hover:bg-gray-800/30"
                    >
                      <td className="px-4 py-3 text-white">
                        {p.marketId.slice(0, 8)}...
                      </td>
                      <td className="text-center px-2 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            p.side === "yes"
                              ? "bg-emerald-900 text-emerald-400"
                              : "bg-red-900 text-red-400"
                          }`}
                        >
                          {p.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-right px-2 py-3 text-gray-300">
                        {p.quantity}
                      </td>
                      <td className="text-right px-2 py-3 text-gray-300">
                        {p.avgPriceCents}%
                      </td>
                      <td className="text-right px-4 py-3 text-gray-300">
                        ${(p.totalCostCents / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Orders tab */}
      {tab === "orders" && (
        <div className="space-y-2">
          {orders.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              No orders yet
            </div>
          ) : (
            <div className="border border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr className="text-xs text-gray-400">
                    <th className="text-left px-4 py-2">Market</th>
                    <th className="text-center px-2 py-2">Side</th>
                    <th className="text-right px-2 py-2">Qty</th>
                    <th className="text-right px-2 py-2">Cost</th>
                    <th className="text-center px-2 py-2">Status</th>
                    <th className="text-right px-4 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-t border-gray-800 hover:bg-gray-800/30"
                    >
                      <td className="px-4 py-3 text-white">
                        {o.marketId.slice(0, 8)}...
                      </td>
                      <td className="text-center px-2 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            o.side === "yes"
                              ? "bg-emerald-900 text-emerald-400"
                              : "bg-red-900 text-red-400"
                          }`}
                        >
                          {o.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-right px-2 py-3 text-gray-300">
                        {o.quantity}
                      </td>
                      <td className="text-right px-2 py-3 text-gray-300">
                        ${(o.totalCostCents / 100).toFixed(2)}
                      </td>
                      <td className="text-center px-2 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            o.status === "filled"
                              ? "bg-green-900 text-green-400"
                              : o.status === "cancelled"
                                ? "bg-gray-700 text-gray-400"
                                : "bg-blue-900 text-blue-400"
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 text-gray-500 text-xs">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History tab placeholder */}
      {tab === "history" && (
        <div className="text-center text-gray-500 text-sm py-8">
          Settled positions will appear here after markets resolve
        </div>
      )}
    </div>
  );
}
