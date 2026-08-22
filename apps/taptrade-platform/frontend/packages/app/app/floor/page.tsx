"use client";

/**
 * /floor — the redesign's vertical slice (Gates 1-3 approved on Figma page
 * 05 Redesign). One lensed Board + the persistent Inspector, on real
 * gateway data and the real order path. Coexists with /predict while the
 * new operating model proves itself; no legacy surface was modified.
 *
 * Continuity rule: selection focuses the Inspector in place — the trader
 * loop (find → evaluate → commit → confirm) crosses zero route boundaries.
 * Confirmation is in-context: a successful order refetches positions, so
 * the selected row gains its HOLD badge and the exposure strip updates.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import type {
  Position,
  PredictionMarket,
} from "@taptrade-ui/api-client/src/prediction-types";
import { useAuth } from "../hooks/useAuth";
import { logger } from "../lib/logger";
import { FloorNav } from "../components/floor/FloorNav";
import { FloorTabBar } from "../components/floor/FloorTabBar";
import { RowMarketV2, type RowPosition } from "../components/floor/RowMarketV2";
import { InspectorPanel } from "../components/floor/InspectorPanel";

const api = createPredictionClient();

type Lens = "trending" | "closing" | "new";
const LENSES: { value: Lens; labelKey: string; fallback: string; sort: "activity" | "closing_soon" | "newest" }[] = [
  { value: "trending", labelKey: "SORT_ACTIVITY", fallback: "Trending", sort: "activity" },
  { value: "closing", labelKey: "SORT_CLOSING_SOON", fallback: "Closing soon", sort: "closing_soon" },
  { value: "new", labelKey: "SORT_NEWEST", fallback: "Newest", sort: "newest" },
];

interface EventGroup {
  key: string;
  title: string | null;
  markets: PredictionMarket[];
}

function groupByEvent(markets: PredictionMarket[]): EventGroup[] {
  const order: string[] = [];
  const byKey = new Map<string, EventGroup>();
  for (const m of markets) {
    const key = m.eventId || m.id;
    let g = byKey.get(key);
    if (!g) {
      g = { key, title: null, markets: [] };
      byKey.set(key, g);
      order.push(key);
    }
    g.markets.push(m);
  }
  for (const g of byKey.values()) {
    if (g.markets.length > 1) g.title = g.markets[0].eventTitle || null;
  }
  return order.map((k) => byKey.get(k) as EventGroup);
}

export default function FloorPage() {
  const { t } = useTranslation("prediction");
  const { isAuthenticated } = useAuth();
  const [lens, setLens] = useState<Lens>("trending");
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const sort = LENSES.find((l) => l.value === lens)?.sort ?? "activity";
    api
      .getMarkets({ status: "open", page: 1, pageSize: 30, sort })
      .then((res) => {
        if (cancelled) return;
        setMarkets(res.data || []);
        setError(null);
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
  }, [lens, reloadNonce]);

  const refetchPositions = useCallback(() => {
    if (!isAuthenticated) {
      setPositions([]);
      return;
    }
    api
      .getPositions()
      .then(setPositions)
      .catch((err: unknown) => {
        logger.warn("Floor", "positions fetch failed", err);
      });
  }, [isAuthenticated]);

  useEffect(() => {
    refetchPositions();
  }, [refetchPositions]);

  const positionByMarket = useMemo(() => {
    const map = new Map<string, RowPosition>();
    for (const p of positions) {
      if (p.quantity > 0) {
        map.set(p.marketId, {
          side: p.side,
          quantity: p.quantity,
          avgPricePoints: p.avgPricePoints,
        });
      }
    }
    return map;
  }, [positions]);

  const groups = useMemo(() => groupByEvent(markets), [markets]);
  const selected = markets.find((m) => m.id === selectedId) ?? null;

  const handleMarketUpdate = useCallback(
    (updated: PredictionMarket) => {
      setMarkets((prev) =>
        prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
      );
      // In-context confirmation: the position refetch is what flips the row
      // badge and the exposure strip — no toast-and-redirect.
      refetchPositions();
    },
    [refetchPositions],
  );

  return (
    <div className="mx-auto grid w-full max-w-[1920px] grid-cols-[150px_minmax(0,1fr)_340px] items-start gap-0 bg-[var(--bg-deep)] max-[1179px]:grid-cols-[150px_minmax(0,1fr)] max-[1023px]:grid-cols-1 max-[1023px]:pb-16">
      <FloorNav active="floor" />

      <main className="min-w-0 px-6 py-5 max-[760px]:px-4">
        <div
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label={t("FLOOR_LENSES", "Board lenses")}
        >
          {LENSES.map((l) => {
            const active = lens === l.value;
            return (
              <button
                key={l.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setLens(l.value)}
                className={`min-h-[30px] cursor-pointer rounded-full border px-3.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors duration-150 ${
                  active
                    ? "border-[var(--accent-lo)] bg-[var(--accent)] text-[var(--ticket-cta-text)]"
                    : "border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--t3)] hover:text-[var(--t1)]"
                }`}
              >
                {t(l.labelKey, l.fallback)}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {loading ? (
            Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="h-[62px] animate-[shimmer_1.5s_infinite] rounded-[8px] bg-[linear-gradient(90deg,var(--surface-2)_25%,var(--border-1)_50%,var(--surface-2)_75%)] bg-[length:200%_100%]"
                aria-hidden="true"
              />
            ))
          ) : error ? (
            <div
              role="alert"
              className="rounded-[8px] border border-[var(--border-1)] border-l-[3px] border-l-[var(--no)] bg-[var(--surface-1)] px-4 py-3"
            >
              <p className="m-0 text-[13px] font-semibold text-[var(--t1)]">
                {t("COULD_NOT_LOAD_MARKETS")}
              </p>
              <p className="mb-0 mt-1 text-[12px] text-[var(--t2)]">{error}</p>
              <button
                type="button"
                onClick={() => setReloadNonce((n) => n + 1)}
                className="mt-2.5 inline-flex min-h-9 cursor-pointer items-center rounded-[6px] border border-[var(--border-2)] bg-[var(--surface-1)] px-3.5 text-[12px] font-semibold text-[var(--t1)]"
              >
                {t("RETRY", "Retry")}
              </button>
            </div>
          ) : markets.length === 0 ? (
            <div className="rounded-[8px] border border-dashed border-[var(--border-2)] bg-[var(--surface-1)] px-4 py-6 text-center">
              <p className="m-0 text-[13px] font-semibold text-[var(--t1)]">
                {t("NO_OPEN_MARKETS")}
              </p>
              <p className="mb-0 mt-1 text-[12px] text-[var(--t3)]">
                {t("CHECK_BACK_SOON")}
              </p>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.key} className="flex flex-col gap-2">
                {g.title && (
                  <div className="mt-1 flex items-center gap-2.5 px-1">
                    <span
                      aria-hidden="true"
                      className="h-3 w-[3px] rounded-[1px] bg-[var(--accent-text)]"
                    />
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--t1)]">
                      {g.title}
                    </span>
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--t3)]">
                      {t("MOMENT_MARKETS_COUNT", { count: g.markets.length })}
                    </span>
                    <Link
                      href={`/event/${g.key}`}
                      className="ml-auto font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-text)] no-underline hover:text-[var(--t1)]"
                    >
                      {t("FLOOR_OPEN_EVENT", "Open event")} →
                    </Link>
                  </div>
                )}
                {g.markets.map((m) => (
                  <RowMarketV2
                    key={m.id}
                    market={m}
                    position={positionByMarket.get(m.id)}
                    selected={selectedId === m.id}
                    onSelect={() => setSelectedId(m.id)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Rule on the full-height grid cell; sticky panel inside it. A
          sticky child paints only its own 100vh, so the border used to
          stop mid-page once the ramp made it visible. */}
      <div className="h-full border-l border-[var(--border-1)] max-[1179px]:hidden">
        <aside
          aria-label={t("FLOOR_INSPECTOR", "Inspector")}
          className="terminal-scrollbar sticky top-16 h-[calc(100vh-64px)] overflow-y-auto p-4"
        >
        <InspectorPanel
          market={selected}
          position={selected ? positionByMarket.get(selected.id) : undefined}
          openPositions={positionByMarket.size}
          onMarketUpdate={handleMarketUpdate}
        />
        </aside>
      </div>

      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-[90] hidden max-h-[70vh] overflow-y-auto rounded-t-[14px] border-t border-[var(--border-1)] bg-[var(--surface-1)] p-4 pb-6 shadow-[var(--shadow-pop)] max-[1179px]:block">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            aria-label={t("CLOSE", "Close")}
            className="mx-auto mb-3 block h-1.5 w-10 cursor-pointer rounded-full border-0 bg-[var(--border-2)] p-0"
          />
          <InspectorPanel
            market={selected}
            position={positionByMarket.get(selected.id)}
            openPositions={positionByMarket.size}
            onMarketUpdate={handleMarketUpdate}
          />
        </div>
      )}
      <FloorTabBar active="floor" />
    </div>
  );
}
