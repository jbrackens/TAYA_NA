"use client";

/**
 * /book — My Book, slice 3 of the gated redesign (REDESIGN-S3). The
 * Object-workspace archetype over the user's own objects: a summary
 * header (open / at risk / uPnL / accuracy / realized from the real
 * portfolio summary), open positions grouped by event with computed
 * unrealized PnL against live prices, a settled section (outcome →
 * payout → what it did to accuracy), and the same persistent Inspector
 * with the real ticket — selling uses the ticket's own sell path.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import type {
  PortfolioSummary,
  Position,
  PredictionMarket,
  SettledPositionResult,
} from "@taptrade-ui/api-client/src/prediction-types";
import { useAuth } from "../hooks/useAuth";
import { FloorNav } from "../components/floor/FloorNav";
import { InspectorPanel } from "../components/floor/InspectorPanel";
import type { RowPosition } from "../components/floor/RowMarketV2";

const api = createPredictionClient();

const EYEBROW_CLASS =
  "font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--t3)]";

function fmtSigned(points: number): string {
  const v = Math.round(points).toLocaleString();
  return points > 0 ? `+${v}` : v;
}

interface OpenLine {
  position: Position;
  market: PredictionMarket | null;
  nowSidePoints: number | null;
  upnl: number | null;
}

export default function MyBookPage() {
  const { t } = useTranslation("prediction");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [marketsById, setMarketsById] = useState<Map<string, PredictionMarket>>(
    () => new Map(),
  );
  const [settled, setSettled] = useState<SettledPositionResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const load = useCallback(async () => {
    const [pos, sum, hist] = await Promise.all([
      api.getPositions(),
      api.getPortfolioSummary(),
      api.getSettledPositions(1, 5).catch(() => null),
    ]);
    const open = pos.filter((p) => p.quantity > 0);
    const ids = [
      ...new Set([
        ...open.map((p) => p.marketId),
        ...(hist?.data || []).map((s) => s.marketId),
      ]),
    ].slice(0, 40);
    const markets = await Promise.all(
      ids.map((id) => api.getMarket(id).catch(() => null)),
    );
    const map = new Map<string, PredictionMarket>();
    for (const m of markets) if (m) map.set(m.id, m);
    return { open, sum, hist: hist?.data || [], map };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    load()
      .then(({ open, sum, hist, map }) => {
        if (cancelled) return;
        setPositions(open);
        setSummary(sum);
        setSettled(hist);
        setMarketsById(map);
        setSelectedId((prev) => prev ?? open[0]?.marketId ?? null);
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
  }, [authLoading, isAuthenticated, load, reloadNonce]);

  const lines = useMemo<OpenLine[]>(
    () =>
      positions.map((p) => {
        const market = marketsById.get(p.marketId) ?? null;
        const nowSide = market
          ? p.side === "yes"
            ? market.yesPricePoints
            : market.noPricePoints
          : null;
        return {
          position: p,
          market,
          nowSidePoints: nowSide,
          upnl: nowSide === null ? null : (nowSide - p.avgPricePoints) * p.quantity,
        };
      }),
    [positions, marketsById],
  );

  const selectedLine =
    lines.find((l) => l.position.marketId === selectedId) ?? null;
  const selectedMarket = selectedLine?.market ?? null;
  const selectedRowPosition: RowPosition | undefined = selectedLine
    ? {
        side: selectedLine.position.side,
        quantity: selectedLine.position.quantity,
        avgPricePoints: selectedLine.position.avgPricePoints,
      }
    : undefined;

  const handleMarketUpdate = useCallback(() => {
    setReloadNonce((n) => n + 1);
  }, []);

  return (
    <div className="mx-auto grid w-full max-w-[1920px] grid-cols-[150px_minmax(0,1fr)_340px] items-start bg-[var(--bg-deep)] max-[1179px]:grid-cols-[150px_minmax(0,1fr)] max-[1023px]:grid-cols-1">
      <FloorNav active="book" />

      <main className="min-w-0 px-6 py-5 max-[760px]:px-4">
        {authLoading || loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="h-[62px] animate-[shimmer_1.5s_infinite] rounded-[8px] bg-[linear-gradient(90deg,var(--surface-2)_25%,var(--border-1)_50%,var(--surface-2)_75%)] bg-[length:200%_100%]"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : !isAuthenticated ? (
          <div className="rounded-[8px] border border-dashed border-[var(--border-2)] bg-[var(--surface-1)] px-4 py-8 text-center">
            <p className="m-0 text-[14px] font-semibold text-[var(--t1)]">
              {t("FLOOR_BOOK_SIGNED_OUT", "My Book needs an account")}
            </p>
            <Link
              href="/auth/login"
              className="mt-3 inline-flex min-h-10 items-center rounded-[8px] bg-[var(--accent)] px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ticket-cta-text)] no-underline"
            >
              {t("LOG_IN")}
            </Link>
          </div>
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
        ) : (
          <>
            {summary && (
              <header className="flex flex-wrap gap-x-6 gap-y-2 rounded-[8px] border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-3">
                {[
                  [t("FLOOR_OPEN_POSITIONS", "Open positions"), String(summary.openPositions), ""],
                  [t("FLOOR_AT_RISK", "At risk"), `${Math.round(summary.investedPoints).toLocaleString()} PTS`, ""],
                  [
                    "uPnL",
                    `${fmtSigned(summary.unrealizedPoints)} PTS`,
                    summary.unrealizedPoints > 0
                      ? "text-[var(--yes-text)]"
                      : summary.unrealizedPoints < 0
                        ? "text-[var(--no-text)]"
                        : "",
                  ],
                  [
                    t("FLOOR_ACCURACY", "Accuracy"),
                    `${Math.round(summary.accuracyPct)}% (${summary.totalPredictions})`,
                    "",
                  ],
                  [
                    t("FLOOR_REALIZED", "Realized"),
                    `${fmtSigned(summary.realizedPoints)} PTS`,
                    "",
                  ],
                ].map(([label, value, tone]) => (
                  <span key={label} className="flex flex-col gap-0.5">
                    <span className={EYEBROW_CLASS}>{label}</span>
                    <span
                      className={`font-mono text-[14px] font-semibold tabular-nums ${tone || "text-[var(--t1)]"}`}
                    >
                      {value}
                    </span>
                  </span>
                ))}
              </header>
            )}

            <span className={`${EYEBROW_CLASS} mt-4 block`}>
              {t("FLOOR_BOOK_OPEN", "Open — select a line to manage in the inspector")}
            </span>
            <div className="mt-2 flex flex-col gap-2">
              {lines.length === 0 ? (
                <div className="rounded-[8px] border border-dashed border-[var(--border-2)] bg-[var(--surface-1)] px-4 py-6 text-center">
                  <p className="m-0 text-[13px] font-semibold text-[var(--t1)]">
                    {t("FLOOR_BOOK_EMPTY", "No open positions")}
                  </p>
                  <Link
                    href="/floor"
                    className="mt-2 inline-block font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-text)] no-underline"
                  >
                    {t("FLOOR_BOOK_EMPTY_CTA", "Browse the Floor")} →
                  </Link>
                </div>
              ) : (
                lines.map((l) => {
                  const selected = selectedId === l.position.marketId;
                  return (
                    <button
                      key={l.position.id}
                      type="button"
                      onClick={() => setSelectedId(l.position.marketId)}
                      aria-pressed={selected}
                      className={`grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_80px_90px] items-center gap-5 rounded-[8px] border border-l-2 px-4 py-3 text-left transition-[background-color,border-color] duration-150 max-[720px]:grid-cols-[minmax(0,1fr)_80px] ${
                        selected
                          ? "border-[var(--border-2)] border-l-[var(--accent-lo)] bg-[var(--accent-soft)]"
                          : "border-[var(--border-1)] bg-[var(--surface-1)] hover:border-[var(--border-2)] hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="line-clamp-2 text-[14px] font-semibold leading-[1.33] text-[var(--t1)]">
                          {l.market?.title ?? l.position.marketId}
                        </span>
                        <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em] text-[var(--t3)]">
                          {l.market?.eventTitle ? `${l.market.eventTitle} · ` : ""}
                          {l.position.quantity}{" "}
                          {l.position.side === "yes" ? t("YES") : t("NO")} @{" "}
                          {l.position.avgPricePoints}¢
                        </span>
                      </span>
                      <span className="flex flex-col gap-[3px]">
                        <span className={EYEBROW_CLASS}>
                          {t("FLOOR_NOW", "Now")}
                        </span>
                        <span className="font-mono text-[14px] font-semibold text-[var(--t1)] tabular-nums">
                          {l.nowSidePoints === null ? "—" : `${l.nowSidePoints}¢`}
                        </span>
                      </span>
                      <span className="flex flex-col gap-[3px] max-[720px]:hidden">
                        <span className={EYEBROW_CLASS}>uPnL</span>
                        <span
                          className={`font-mono text-[14px] font-semibold tabular-nums ${
                            l.upnl === null
                              ? "text-[var(--t4)]"
                              : l.upnl > 0
                                ? "text-[var(--yes-text)]"
                                : l.upnl < 0
                                  ? "text-[var(--no-text)]"
                                  : "text-[var(--t1)]"
                          }`}
                        >
                          {l.upnl === null ? "—" : fmtSigned(l.upnl)}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {settled.length > 0 && (
              <>
                <span className={`${EYEBROW_CLASS} mt-5 block`}>
                  {t("FLOOR_BOOK_SETTLED", "Settled — outcome · payout")}
                </span>
                <div className="mt-2 flex flex-col gap-2">
                  {settled.map((s) => {
                    const m = marketsById.get(s.marketId);
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-4 rounded-[8px] border border-dashed border-[var(--border-2)] bg-[var(--surface-2)] px-4 py-2.5"
                      >
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="line-clamp-1 text-[13px] font-semibold text-[var(--t1)]">
                            {m?.title ?? s.marketId}
                          </span>
                          <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em] text-[var(--t3)]">
                            {s.quantity} {s.side === "yes" ? t("YES") : t("NO")} @{" "}
                            {s.entryPricePoints}¢ →{" "}
                            {new Date(s.paidAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </span>
                        <span
                          className={`font-mono text-[14px] font-semibold tabular-nums ${
                            s.realizedPoints > 0
                              ? "text-[var(--yes-text)]"
                              : s.realizedPoints < 0
                                ? "text-[var(--no-text)]"
                                : "text-[var(--t1)]"
                          }`}
                        >
                          {fmtSigned(s.realizedPoints)} PTS
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </main>

      <aside
        aria-label={t("FLOOR_INSPECTOR", "Inspector")}
        className="terminal-scrollbar sticky top-16 h-[calc(100vh-64px)] overflow-y-auto border-l border-[var(--border-1)] bg-[var(--bg-deep)] p-4 max-[1179px]:hidden"
      >
        <InspectorPanel
          market={selectedMarket}
          position={selectedRowPosition}
          openPositions={lines.length}
          onMarketUpdate={handleMarketUpdate}
        />
      </aside>

      {selectedMarket && (
        <div className="fixed inset-x-0 bottom-0 z-[90] hidden max-h-[70vh] overflow-y-auto rounded-t-[14px] border-t border-[var(--border-1)] bg-[var(--surface-1)] p-4 pb-6 shadow-[0_-12px_32px_rgba(13,17,20,0.18)] max-[1179px]:block">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            aria-label={t("CLOSE", "Close")}
            className="mx-auto mb-3 block h-1.5 w-10 cursor-pointer rounded-full border-0 bg-[var(--border-2)] p-0"
          />
          <InspectorPanel
            market={selectedMarket}
            position={selectedRowPosition}
            openPositions={lines.length}
            onMarketUpdate={handleMarketUpdate}
          />
        </div>
      )}
    </div>
  );
}
