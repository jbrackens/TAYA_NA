"use client";
import { DashboardLayout } from "../../components/dashboard";
import { ErrorBoundary, ErrorState } from "../../components/shared";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import type {
  PredictionMarket,
  DashboardVolumeStats,
  PaginatedResponse,
} from "@taptrade-ui/api-client/src/prediction-types";

const predictionClient = createPredictionClient();

const pageTitleClassName =
  "mb-6 text-[28px] font-bold text-[var(--t1,#1a1a1a)]";
const cardClassName =
  "rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] p-5";
const cardLabelClassName =
  "mb-2 text-xs uppercase tracking-[0.04em] text-[var(--t3,#757575)]";
const monoValueClassName =
  "font-['IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace] tabular-nums";
const cardValueClassName = `${monoValueClassName} text-[32px] font-bold text-[var(--t1,#1a1a1a)]`;
const cardSubClassName = "mt-1.5 text-[13px] text-[var(--t2,#4a4a4a)]";
const listClassName = "m-0 list-none p-0";
const listItemClassName =
  "flex justify-between gap-3 border-b border-[var(--border-2,#f0ead7)] py-2 text-[13px] text-[var(--t1,#1a1a1a)]";
const ellipsisClassName = "overflow-hidden text-ellipsis";
const mutedTextClassName = "text-[var(--t2,#4a4a4a)]";

function moverDeltaClassName(delta: number) {
  if (delta > 0) return "text-[var(--yes-text,#1a6849)]";
  if (delta < 0) return "text-[var(--no-text,#b03a3a)]";
  return mutedTextClassName;
}

function formatPoints(points: number) {
  // Points unit-model (2026-07-07): whole Points on the wire — no /100.
  return `${points.toLocaleString(undefined, { maximumFractionDigits: 0 })} pts`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

function DashboardPageContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [openMarkets, setOpenMarkets] =
    useState<PaginatedResponse<PredictionMarket> | null>(null);
  const [closedMarkets, setClosedMarkets] =
    useState<PaginatedResponse<PredictionMarket> | null>(null);
  const [volume, setVolume] = useState<DashboardVolumeStats | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [open, closed, volStats] = await Promise.all([
          predictionClient.getMarkets({ status: "open", pageSize: 100 }),
          predictionClient.getMarkets({ status: "closed", pageSize: 100 }),
          predictionClient.getDashboardVolume("24h", 5),
        ]);
        setOpenMarkets(open);
        setClosedMarkets(closed);
        setVolume(volStats);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [reloadKey]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setReloadKey((value) => value + 1);
  };

  if (isLoading) {
    return (
      <div>
        <h1 className={pageTitleClassName}>Dashboard</h1>
        <div className="flex min-h-[400px] items-center justify-center">
          <div>
            <div className="h-10 w-10 animate-[spin_0.8s_linear_infinite] rounded-full border-[3px] border-[var(--border-1,#e5dfd2)] border-t-[var(--focus-ring,#0e7a53)]" />
            <p className="m-0 mt-3 text-center text-sm text-[var(--t2,#4a4a4a)]">
              Loading dashboard data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className={pageTitleClassName}>Dashboard</h1>
        <ErrorState
          title="Failed to load dashboard"
          message={error}
          onRetry={handleRetry}
          showRetryButton={true}
        />
      </div>
    );
  }

  if (!openMarkets || !closedMarkets || !volume) {
    return null;
  }

  // Closing soon: top 5 open markets by closeAt ASC
  const closingSoon = [...openMarkets.data]
    .sort(
      (a, b) => new Date(a.closeAt).getTime() - new Date(b.closeAt).getTime(),
    )
    .slice(0, 5);

  // Settlement queue: closed markets awaiting resolution
  const settlementQueue = [...closedMarkets.data]
    .sort(
      (a, b) => new Date(a.closeAt).getTime() - new Date(b.closeAt).getTime(),
    )
    .slice(0, 5);

  return (
    <div>
      <h1 className={pageTitleClassName}>Dashboard</h1>

      <DashboardLayout>
        {/* Open Markets */}
        <section className={cardClassName}>
          <div className={cardLabelClassName}>Open Markets</div>
          <div className={cardValueClassName}>{openMarkets.meta.total}</div>
          <div className={cardSubClassName}>Closing soon:</div>
          <ul className={listClassName}>
            {closingSoon.map((m) => (
              <li
                key={m.id}
                className={`${listItemClassName} cursor-pointer`}
                onClick={() => router.push(`/prediction-admin/markets`)}
              >
                <span className={ellipsisClassName}>{m.ticker}</span>
                <span className={mutedTextClassName}>
                  {formatDate(m.closeAt)}
                </span>
              </li>
            ))}
            {closingSoon.length === 0 && (
              <li className={listItemClassName}>
                <span className={mutedTextClassName}>No open markets</span>
              </li>
            )}
          </ul>
        </section>

        {/* Settlement Queue */}
        <section className={cardClassName}>
          <div className={cardLabelClassName}>Settlement Queue</div>
          <div className={cardValueClassName}>{closedMarkets.meta.total}</div>
          <div className={cardSubClassName}>Awaiting resolution:</div>
          <ul className={listClassName}>
            {settlementQueue.map((m) => (
              <li
                key={m.id}
                className={`${listItemClassName} cursor-pointer`}
                onClick={() => router.push(`/prediction-admin/settlements`)}
              >
                <span className={ellipsisClassName}>{m.ticker}</span>
                <span className={mutedTextClassName}>
                  closed {formatDate(m.closeAt)}
                </span>
              </li>
            ))}
            {settlementQueue.length === 0 && (
              <li className={listItemClassName}>
                <span className={mutedTextClassName}>Queue empty</span>
              </li>
            )}
          </ul>
        </section>

        {/* 24h Trade Volume */}
        <section className={cardClassName}>
          <div className={cardLabelClassName}>24h Volume</div>
          <div className={cardValueClassName}>
            {formatPoints(volume.totalVolumePoints)}
          </div>
          <div className={cardSubClassName}>
            {volume.tradeCount} trade{volume.tradeCount === 1 ? "" : "s"}
          </div>
        </section>

        {/* Top Movers */}
        <section className={cardClassName}>
          <div className={cardLabelClassName}>Top Movers (24h)</div>
          <ul className={listClassName}>
            {volume.topMovers.map((mv) => {
              const delta =
                mv.yesPricePointsNow - mv.yesPricePointsStart;
              const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
              return (
                <li key={mv.marketId} className={listItemClassName}>
                  <span className={ellipsisClassName}>{mv.ticker}</span>
                  <span
                    className={`${monoValueClassName} ${moverDeltaClassName(delta)}`}
                  >
                    {mv.yesPricePointsStart}% → {mv.yesPricePointsNow}
                    % ({sign}
                    {Math.abs(delta)})
                  </span>
                </li>
              );
            })}
            {volume.topMovers.length === 0 && (
              <li className={listItemClassName}>
                <span className={mutedTextClassName}>No trades in window</span>
              </li>
            )}
          </ul>
        </section>
      </DashboardLayout>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardPageContent />
    </ErrorBoundary>
  );
}
