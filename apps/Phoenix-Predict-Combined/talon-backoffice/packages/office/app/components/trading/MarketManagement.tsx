"use client";

import styled from "styled-components";
import { Badge, Button } from "../shared";
import { useState } from "react";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const MarketRow = styled.div`
  padding: 12px;
  background-color: var(--border-1, #e5dfd2);
  border-radius: 4px;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  align-items: center;
  gap: 12px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

const MarketName = styled.span`
  font-size: 13px;
  color: var(--t1, #1a1a1a);
  font-weight: 500;
`;

const MarketInfo = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: var(--t2, #4a4a4a);
`;

const SelectionCount = styled.span`
  background-color: var(--surface-1, var(--t1, #1a1a1a));
  padding: 2px 6px;
  border-radius: 3px;
  color: var(--focus-ring, #0e7a53);
  font-weight: 600;
`;

const Liability = styled.span`
  color: var(--no-text, #a8472d);
  font-weight: 600;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const SuspendButton = styled(Button)`
  min-width: 80px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: var(--t2, #4a4a4a);
`;

export interface MarketData {
  id: string;
  name: string;
  status: "open" | "suspended" | "settled";
  selectionCount: number;
  liability: number;
  betCount?: number;
}

interface MarketManagementProps {
  markets?: MarketData[];
  onMarketToggle?: (marketId: string) => void;
  onViewSelections?: (marketId: string) => void;
}

export function MarketManagement({
  markets = [],
  onMarketToggle,
  onViewSelections,
}: MarketManagementProps) {
  const [localMarkets, setLocalMarkets] = useState<MarketData[]>(markets);
  const canToggleMarkets = typeof onMarketToggle === "function";

  const handleToggle = (marketId: string) => {
    if (!canToggleMarkets) {
      return;
    }
    setLocalMarkets((prev) =>
      prev.map((m) =>
        m.id === marketId
          ? { ...m, status: m.status === "open" ? "suspended" : "open" }
          : m,
      ),
    );
    onMarketToggle?.(marketId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="primary">Open</Badge>;
      case "suspended":
        return <Badge variant="danger">Suspended</Badge>;
      case "settled":
        return <Badge variant="secondary">Settled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Container>
      {localMarkets.length > 0 ? (
        localMarkets.map((market) => (
          <MarketRow key={market.id}>
            <MarketName>{market.name}</MarketName>

            <MarketInfo>{getStatusBadge(market.status)}</MarketInfo>

            <MarketInfo>
              Selections:{" "}
              <SelectionCount>{market.selectionCount}</SelectionCount>
            </MarketInfo>

            <MarketInfo>
              Liability:{" "}
              <Liability>${(market.liability / 1000).toFixed(1)}K</Liability>
            </MarketInfo>

            <ActionButtons>
              <SuspendButton
                variant={market.status === "open" ? "danger" : "primary"}
                size="sm"
                onClick={() => handleToggle(market.id)}
                disabled={!canToggleMarkets}
              >
                {market.status === "open" ? "Suspend" : "Resume"}
              </SuspendButton>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onViewSelections?.(market.id)}
              >
                View
              </Button>
            </ActionButtons>
          </MarketRow>
        ))
      ) : (
        <EmptyState>No markets available</EmptyState>
      )}

      {!canToggleMarkets && localMarkets.length > 0 && (
        <div
          style={{
            fontSize: "12px",
            color: "var(--t2, #4a4a4a)",
            padding: "10px 12px",
            backgroundColor: "rgba(15, 52, 96, 0.5)",
            borderRadius: "4px",
          }}
        >
          Market controls are view-only. Toggle requires the onMarketToggle
          prop.
        </div>
      )}
    </Container>
  );
}
