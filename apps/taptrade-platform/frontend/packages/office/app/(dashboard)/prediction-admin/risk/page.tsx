"use client";

// Prediction-native operator risk dashboard (feat/risk-dashboard-v1).
// Replaces the redirected legacy /risk-management subtree. Data is the
// real GET /api/v1/admin/prediction/risk snapshot computed by the Go gateway
// (SQLRepository.RiskSnapshot) — settlement aging, cost-basis concentration,
// and platform point-accounting invariants. No mock data.
import { useEffect, useState } from "react";
import { Button, Card } from "../../../components/shared";
import { adminFetch } from "../../../lib/admin-fetch";

interface AgingMarket {
  marketId: string;
  ticker: string;
  closedAt: string;
  ageSeconds: number;
}

interface SettlementAging {
  closedAwaitingSettlement: number;
  oldestAgeSeconds: number;
  items: AgingMarket[];
}

interface MarketExposure {
  marketId: string;
  ticker: string;
  status: string;
  openPointCostPoints: number;
  maxReturnedPoints: number;
  holders: number;
}

interface PointAccountingInvariants {
  openPositionPointCostPoints: number;
  maxSettlementPoints: number;
  reservedPoints: number;
  openOrderCount: number;
  nonTerminalMarkets: number;
  driftAlerts24h: number;
}

interface RiskSnapshot {
  generatedAt: string;
  settlementAging: SettlementAging;
  costBasisConcentration: MarketExposure[];
  pointAccounting?: PointAccountingInvariants;
}

function formatPoints(cents: number): string {
  return `${(cents / 100).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} pts`;
}

function formatAge(seconds: number): string {
  if (seconds <= 0) return "0m";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const pageTitleClassName =
  "mb-1 text-[28px] font-bold text-[var(--t1,#1a1a1a)]";
const sectionTitleClassName =
  "mb-[14px] mt-7 text-lg font-semibold text-[var(--t1,#1a1a1a)]";
const statLabelClassName =
  "mb-2 text-xs font-normal uppercase tracking-[0.04em] text-[var(--t2,#4a4a4a)]";
const tableClassName = "w-full border-collapse text-[13px]";
const thClassName =
  "border-b-2 border-[var(--border-1,#e5dfd2)] px-3 py-2.5 text-left font-semibold text-[var(--t2,#4a4a4a)]";
const tdClassName =
  "border-b border-[var(--border-1,#e5dfd2)] px-3 py-2.5 text-[var(--t1,#1a1a1a)]";

function statValueClassName(danger?: boolean) {
  return `text-[26px] font-bold ${
    danger
      ? "text-[var(--no-text,#b4321f)]"
      : "text-[var(--focus-ring,#0e7a53)]"
  }`;
}

function bannerClassName(kind: "loading" | "error" | "empty") {
  return `rounded-lg bg-[var(--surface-1,#f6f1e7)] p-4 text-sm ${
    kind === "error"
      ? "text-[var(--no-text,#b4321f)]"
      : "text-[var(--t2,#4a4a4a)]"
  }`;
}

export default function PredictionRiskPage() {
  const [snapshot, setSnapshot] = useState<RiskSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await adminFetch("/api/v1/admin/prediction/risk");
        if (!res.ok) {
          throw new Error(`risk snapshot failed (${res.status})`);
        }
        const data = (await res.json()) as RiskSnapshot;
        if (!cancelled) setSnapshot(data);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className={pageTitleClassName}>Risk — Prediction</h1>
        <div className={bannerClassName("loading")}>Loading risk snapshot…</div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div>
        <h1 className={pageTitleClassName}>Risk — Prediction</h1>
        <div className={bannerClassName("error")}>
          Could not load risk snapshot: {error ?? "no data"}
        </div>
      </div>
    );
  }

  const pointAccounting = snapshot.pointAccounting;
  if (!pointAccounting) {
    return (
      <div>
        <h1 className={pageTitleClassName}>Risk — Prediction</h1>
        <div className={bannerClassName("error")}>
          Could not load risk snapshot: point-accounting data missing
        </div>
      </div>
    );
  }
  const aging = snapshot.settlementAging;

  async function exportRiskCSV() {
    setExporting(true);
    setError(null);
    try {
      const res = await adminFetch("/api/v1/admin/prediction/risk?format=csv");
      if (!res.ok) {
        throw new Error(`risk export failed (${res.status})`);
      }
      const csv = await res.text();
      const url = window.URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "prediction-risk-snapshot.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={pageTitleClassName}>Risk — Prediction</h1>
          <p className="m-0 text-xs text-[var(--t2,#4a4a4a)]">
            Snapshot generated {new Date(snapshot.generatedAt).toLocaleString()}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={exporting}
          onClick={exportRiskCSV}
        >
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <h2 className={sectionTitleClassName}>Point accounting invariants</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Card className="!p-[18px]">
          <div className={statLabelClassName}>Open position point cost</div>
          <div className={statValueClassName()}>
            {formatPoints(pointAccounting.openPositionPointCostPoints)}
          </div>
        </Card>
        <Card className="!p-[18px]">
          <div className={statLabelClassName}>Max settlement points</div>
          <div className={statValueClassName(true)}>
            {formatPoints(pointAccounting.maxSettlementPoints)}
          </div>
        </Card>
        <Card className="!p-[18px]">
          <div className={statLabelClassName}>Reserved points</div>
          <div className={statValueClassName()}>
            {formatPoints(pointAccounting.reservedPoints)}
          </div>
        </Card>
        <Card className="!p-[18px]">
          <div className={statLabelClassName}>Resting orders</div>
          <div className={statValueClassName()}>
            {pointAccounting.openOrderCount.toLocaleString()}
          </div>
        </Card>
        <Card className="!p-[18px]">
          <div className={statLabelClassName}>Non-terminal markets</div>
          <div className={statValueClassName()}>
            {pointAccounting.nonTerminalMarkets.toLocaleString()}
          </div>
        </Card>
        <Card className="!p-[18px]">
          <div className={statLabelClassName}>
            Collateral drift alerts (24h)
          </div>
          <div
            className={statValueClassName(pointAccounting.driftAlerts24h > 0)}
          >
            {pointAccounting.driftAlerts24h.toLocaleString()}
          </div>
        </Card>
      </div>

      <h2 className={sectionTitleClassName}>
        Settlement aging — {aging.closedAwaitingSettlement} closed awaiting
        settlement (oldest {formatAge(aging.oldestAgeSeconds)})
      </h2>
      {aging.items.length === 0 ? (
        <div className={bannerClassName("empty")}>
          No closed markets awaiting settlement.
        </div>
      ) : (
        <table className={tableClassName}>
          <thead>
            <tr>
              <th className={thClassName}>Ticker</th>
              <th className={thClassName}>Closed at</th>
              <th className={thClassName}>Age</th>
            </tr>
          </thead>
          <tbody>
            {aging.items.map((m) => (
              <tr key={m.marketId}>
                <td className={tdClassName}>{m.ticker}</td>
                <td className={tdClassName}>
                  {new Date(m.closedAt).toLocaleString()}
                </td>
                <td className={tdClassName}>{formatAge(m.ageSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className={sectionTitleClassName}>
        Point-cost concentration (top markets by open exposure)
      </h2>
      {snapshot.costBasisConcentration.length === 0 ? (
        <div className={bannerClassName("empty")}>
          No open exposure on any market.
        </div>
      ) : (
        <table className={tableClassName}>
          <thead>
            <tr>
              <th className={thClassName}>Ticker</th>
              <th className={thClassName}>Status</th>
              <th className={thClassName}>Open point cost</th>
              <th className={thClassName}>Max returned points</th>
              <th className={thClassName}>Holders</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.costBasisConcentration.map((m) => (
              <tr key={m.marketId}>
                <td className={tdClassName}>{m.ticker}</td>
                <td className={tdClassName}>{m.status}</td>
                <td className={tdClassName}>
                  {formatPoints(m.openPointCostPoints)}
                </td>
                <td className={tdClassName}>
                  {formatPoints(m.maxReturnedPoints)}
                </td>
                <td className={tdClassName}>{m.holders.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
