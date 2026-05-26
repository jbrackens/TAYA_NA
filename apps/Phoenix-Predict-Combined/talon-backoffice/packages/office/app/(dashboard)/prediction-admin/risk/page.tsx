"use client";

// Prediction-native operator risk dashboard (feat/risk-dashboard-v1).
// Replaces the redirected sportsbook /risk-management subtree. Data is the
// real GET /api/v1/admin/prediction/risk snapshot computed by the Go gateway
// (SQLRepository.RiskSnapshot) — settlement aging, cost-basis concentration,
// and platform money invariants. No mock data.
import { useEffect, useState } from "react";
import { Card } from "../../../components/shared";
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
  openCostCents: number;
  maxPayoutLiabilityCents: number;
  holders: number;
}

interface MoneyInvariants {
  openPositionCostCents: number;
  maxSettlementLiabilityCents: number;
  reservedCashCents: number;
  openOrderCount: number;
  nonTerminalMarkets: number;
  driftAlerts24h: number;
}

interface RiskSnapshot {
  generatedAt: string;
  settlementAging: SettlementAging;
  costBasisConcentration: MarketExposure[];
  moneyInvariants: MoneyInvariants;
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
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

  const mi = snapshot.moneyInvariants;
  const aging = snapshot.settlementAging;

  return (
    <div>
      <h1 className={pageTitleClassName}>Risk — Prediction</h1>
      <p className="m-0 mb-6 text-xs text-[var(--t2,#4a4a4a)]">
        Snapshot generated {new Date(snapshot.generatedAt).toLocaleString()}
      </p>

      <h2 className={sectionTitleClassName}>Money invariants</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Card className="!p-[18px]">
          <div className={statLabelClassName}>Open position cost basis</div>
          <div className={statValueClassName()}>
            {formatCents(mi.openPositionCostCents)}
          </div>
        </Card>
        <Card className="!p-[18px]">
          <div className={statLabelClassName}>Max settlement liability</div>
          <div className={statValueClassName(true)}>
            {formatCents(mi.maxSettlementLiabilityCents)}
          </div>
        </Card>
        <Card className="!p-[18px]">
          <div className={statLabelClassName}>Reserved (held) cash</div>
          <div className={statValueClassName()}>
            {formatCents(mi.reservedCashCents)}
          </div>
        </Card>
        <Card className="!p-[18px]">
          <div className={statLabelClassName}>Resting orders</div>
          <div className={statValueClassName()}>
            {mi.openOrderCount.toLocaleString()}
          </div>
        </Card>
        <Card className="!p-[18px]">
          <div className={statLabelClassName}>Non-terminal markets</div>
          <div className={statValueClassName()}>
            {mi.nonTerminalMarkets.toLocaleString()}
          </div>
        </Card>
        <Card className="!p-[18px]">
          <div className={statLabelClassName}>
            Collateral drift alerts (24h)
          </div>
          <div className={statValueClassName(mi.driftAlerts24h > 0)}>
            {mi.driftAlerts24h.toLocaleString()}
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
        Cost-basis concentration (top markets by open exposure)
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
              <th className={thClassName}>Open cost</th>
              <th className={thClassName}>Max payout liability</th>
              <th className={thClassName}>Holders</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.costBasisConcentration.map((m) => (
              <tr key={m.marketId}>
                <td className={tdClassName}>{m.ticker}</td>
                <td className={tdClassName}>{m.status}</td>
                <td className={tdClassName}>{formatCents(m.openCostCents)}</td>
                <td className={tdClassName}>
                  {formatCents(m.maxPayoutLiabilityCents)}
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
