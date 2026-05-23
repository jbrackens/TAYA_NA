"use client";

// Prediction-native operator risk dashboard (feat/risk-dashboard-v1).
// Replaces the redirected sportsbook /risk-management subtree. Data is the
// real GET /api/v1/admin/prediction/risk snapshot computed by the Go gateway
// (SQLRepository.RiskSnapshot) — settlement aging, cost-basis concentration,
// and platform money invariants. No mock data.
import { useEffect, useState } from "react";
import styled from "styled-components";
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

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
  color: var(--t1, #1a1a1a);
`;

const Subtle = styled.p`
  font-size: 12px;
  color: var(--t2, #4a4a4a);
  margin: 0 0 24px 0;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin: 28px 0 14px 0;
  color: var(--t1, #1a1a1a);
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const StatCard = styled(Card)`
  padding: 18px;
`;

const StatLabel = styled.div`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--t2, #4a4a4a);
  margin-bottom: 8px;
`;

const StatValue = styled.div<{ $danger?: boolean }>`
  font-size: 26px;
  font-weight: 700;
  color: ${(p) =>
    p.$danger ? "var(--no-text, #b4321f)" : "var(--focus-ring, #0e7a53)"};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const Th = styled.th`
  text-align: left;
  padding: 10px 12px;
  border-bottom: 2px solid var(--border-1, #e5dfd2);
  color: var(--t2, #4a4a4a);
  font-weight: 600;
`;

const Td = styled.td`
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-1, #e5dfd2);
  color: var(--t1, #1a1a1a);
`;

const Banner = styled.div<{ $kind: "loading" | "error" | "empty" }>`
  padding: 16px;
  border-radius: 8px;
  font-size: 14px;
  background: var(--surface-1, #f6f1e7);
  color: ${(p) =>
    p.$kind === "error" ? "var(--no-text, #b4321f)" : "var(--t2, #4a4a4a)"};
`;

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
        <PageTitle>Risk — Prediction</PageTitle>
        <Banner $kind="loading">Loading risk snapshot…</Banner>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div>
        <PageTitle>Risk — Prediction</PageTitle>
        <Banner $kind="error">
          Could not load risk snapshot: {error ?? "no data"}
        </Banner>
      </div>
    );
  }

  const mi = snapshot.moneyInvariants;
  const aging = snapshot.settlementAging;

  return (
    <div>
      <PageTitle>Risk — Prediction</PageTitle>
      <Subtle>
        Snapshot generated {new Date(snapshot.generatedAt).toLocaleString()}
      </Subtle>

      <SectionTitle>Money invariants</SectionTitle>
      <StatGrid>
        <StatCard>
          <StatLabel>Open position cost basis</StatLabel>
          <StatValue>{formatCents(mi.openPositionCostCents)}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Max settlement liability</StatLabel>
          <StatValue $danger>
            {formatCents(mi.maxSettlementLiabilityCents)}
          </StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Reserved (held) cash</StatLabel>
          <StatValue>{formatCents(mi.reservedCashCents)}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Resting orders</StatLabel>
          <StatValue>{mi.openOrderCount.toLocaleString()}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Non-terminal markets</StatLabel>
          <StatValue>{mi.nonTerminalMarkets.toLocaleString()}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>Collateral drift alerts (24h)</StatLabel>
          <StatValue $danger={mi.driftAlerts24h > 0}>
            {mi.driftAlerts24h.toLocaleString()}
          </StatValue>
        </StatCard>
      </StatGrid>

      <SectionTitle>
        Settlement aging — {aging.closedAwaitingSettlement} closed awaiting
        settlement (oldest {formatAge(aging.oldestAgeSeconds)})
      </SectionTitle>
      {aging.items.length === 0 ? (
        <Banner $kind="empty">No closed markets awaiting settlement.</Banner>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Ticker</Th>
              <Th>Closed at</Th>
              <Th>Age</Th>
            </tr>
          </thead>
          <tbody>
            {aging.items.map((m) => (
              <tr key={m.marketId}>
                <Td>{m.ticker}</Td>
                <Td>{new Date(m.closedAt).toLocaleString()}</Td>
                <Td>{formatAge(m.ageSeconds)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <SectionTitle>
        Cost-basis concentration (top markets by open exposure)
      </SectionTitle>
      {snapshot.costBasisConcentration.length === 0 ? (
        <Banner $kind="empty">No open exposure on any market.</Banner>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Ticker</Th>
              <Th>Status</Th>
              <Th>Open cost</Th>
              <Th>Max payout liability</Th>
              <Th>Holders</Th>
            </tr>
          </thead>
          <tbody>
            {snapshot.costBasisConcentration.map((m) => (
              <tr key={m.marketId}>
                <Td>{m.ticker}</Td>
                <Td>{m.status}</Td>
                <Td>{formatCents(m.openCostCents)}</Td>
                <Td>{formatCents(m.maxPayoutLiabilityCents)}</Td>
                <Td>{m.holders.toLocaleString()}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
