"use client";
import { DashboardLayout } from "../../components/dashboard";
import { ErrorBoundary, ErrorState } from "../../components/shared";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import type {
  PredictionMarket,
  DashboardVolumeStats,
  PaginatedResponse,
} from "@phoenix-ui/api-client/src/prediction-types";

const predictionClient = createPredictionClient();

const pageTitleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  marginBottom: 24,
  color: "var(--t1, #1a1a1a)",
};

const loadingShellStyle: React.CSSProperties = {
  minHeight: 400,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const loadingSpinnerStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  border: "3px solid var(--border-1, #e5dfd2)",
  borderTopColor: "var(--focus-ring, #0e7a53)",
  borderRadius: "50%",
  animation: "office-dashboard-spin 0.8s linear infinite",
};

const loadingTextStyle: React.CSSProperties = {
  margin: "12px 0 0 0",
  fontSize: 14,
  color: "var(--t2, #4a4a4a)",
  textAlign: "center",
};

const cardStyle: React.CSSProperties = {
  background: "var(--surface-1, #ffffff)",
  border: "1px solid var(--border-1, #e5dfd2)",
  borderRadius: 8,
  padding: 20,
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--t3, #757575)",
  marginBottom: 8,
};

const cardValueStyle: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 700,
  color: "var(--t1, #1a1a1a)",
  fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  fontVariantNumeric: "tabular-nums",
};

const cardSubStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--t2, #4a4a4a)",
  marginTop: 6,
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
};

const listItemStyle: React.CSSProperties = {
  padding: "8px 0",
  borderBottom: "1px solid var(--border-2, #f0ead7)",
  fontSize: 13,
  color: "var(--t1, #1a1a1a)",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
};

function formatUsd(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
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
        <h1 style={pageTitleStyle}>Dashboard</h1>
        <style>
          {
            "@keyframes office-dashboard-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"
          }
        </style>
        <div style={loadingShellStyle}>
          <div>
            <div style={loadingSpinnerStyle} />
            <p style={loadingTextStyle}>Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 style={pageTitleStyle}>Dashboard</h1>
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
      <h1 style={pageTitleStyle}>Dashboard</h1>

      <DashboardLayout>
        {/* Open Markets */}
        <section style={cardStyle}>
          <div style={cardLabelStyle}>Open Markets</div>
          <div style={cardValueStyle}>{openMarkets.meta.total}</div>
          <div style={cardSubStyle}>Closing soon:</div>
          <ul style={listStyle}>
            {closingSoon.map((m) => (
              <li
                key={m.id}
                style={{ ...listItemStyle, cursor: "pointer" }}
                onClick={() => router.push(`/prediction-admin/markets`)}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.ticker}
                </span>
                <span style={{ color: "var(--t2, #4a4a4a)" }}>
                  {formatDate(m.closeAt)}
                </span>
              </li>
            ))}
            {closingSoon.length === 0 && (
              <li style={listItemStyle}>
                <span style={{ color: "var(--t2, #4a4a4a)" }}>
                  No open markets
                </span>
              </li>
            )}
          </ul>
        </section>

        {/* Settlement Queue */}
        <section style={cardStyle}>
          <div style={cardLabelStyle}>Settlement Queue</div>
          <div style={cardValueStyle}>{closedMarkets.meta.total}</div>
          <div style={cardSubStyle}>Awaiting resolution:</div>
          <ul style={listStyle}>
            {settlementQueue.map((m) => (
              <li
                key={m.id}
                style={{ ...listItemStyle, cursor: "pointer" }}
                onClick={() => router.push(`/prediction-admin/settlements`)}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.ticker}
                </span>
                <span style={{ color: "var(--t2, #4a4a4a)" }}>
                  closed {formatDate(m.closeAt)}
                </span>
              </li>
            ))}
            {settlementQueue.length === 0 && (
              <li style={listItemStyle}>
                <span style={{ color: "var(--t2, #4a4a4a)" }}>Queue empty</span>
              </li>
            )}
          </ul>
        </section>

        {/* 24h Trade Volume */}
        <section style={cardStyle}>
          <div style={cardLabelStyle}>24h Volume</div>
          <div style={cardValueStyle}>{formatUsd(volume.totalVolumeCents)}</div>
          <div style={cardSubStyle}>
            {volume.tradeCount} trade{volume.tradeCount === 1 ? "" : "s"}
          </div>
        </section>

        {/* Top Movers */}
        <section style={cardStyle}>
          <div style={cardLabelStyle}>Top Movers (24h)</div>
          <ul style={listStyle}>
            {volume.topMovers.map((mv) => {
              const delta = mv.yesPriceCentsNow - mv.yesPriceCentsStart;
              const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
              const color =
                delta > 0
                  ? "var(--yes-text, #1a6849)"
                  : delta < 0
                    ? "var(--no-text, #b03a3a)"
                    : "var(--t2, #4a4a4a)";
              return (
                <li key={mv.marketId} style={listItemStyle}>
                  <span
                    style={{ overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {mv.ticker}
                  </span>
                  <span
                    style={{
                      color,
                      fontFamily:
                        "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {mv.yesPriceCentsStart}% → {mv.yesPriceCentsNow}% ({sign}
                    {Math.abs(delta)})
                  </span>
                </li>
              );
            })}
            {volume.topMovers.length === 0 && (
              <li style={listItemStyle}>
                <span style={{ color: "var(--t2, #4a4a4a)" }}>
                  No trades in window
                </span>
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
