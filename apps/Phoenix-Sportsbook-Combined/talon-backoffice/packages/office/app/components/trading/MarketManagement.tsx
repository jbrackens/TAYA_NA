'use client';

import styled from 'styled-components';
import { Badge, Button } from '../shared';
import { useState } from 'react';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const MarketRow = styled.div`
  padding: 12px;
  background-color: #0f3460;
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
  color: #ffffff;
  font-weight: 500;
`;

const MarketInfo = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: #a0a0a0;
`;

const SelectionCount = styled.span`
  background-color: #16213e;
  padding: 2px 6px;
  border-radius: 3px;
  color: #4a7eff;
  font-weight: 600;
`;

const Liability = styled.span`
  color: #f87171;
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
  color: #a0a0a0;
`;

export interface MarketData {
  id: string;
  name: string;
  status: 'open' | 'suspended' | 'settled';
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

  const handleToggle = (marketId: string) => {
    setLocalMarkets((prev) =>
      prev.map((m) =>
        m.id === marketId
          ? { ...m, status: m.status === 'open' ? 'suspended' : 'open' }
          : m,
      ),
    );
    onMarketToggle?.(marketId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="primary">Open</Badge>;
      case 'suspended':
        return <Badge variant="danger">Suspended</Badge>;
      case 'settled':
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

            <MarketInfo>
              {getStatusBadge(market.status)}
            </MarketInfo>

            <MarketInfo>
              Selections: <SelectionCount>{market.selectionCount}</SelectionCount>
            </MarketInfo>

            <MarketInfo>
              Liability: <Liability>${(market.liability / 1000).toFixed(1)}K</Liability>
            </MarketInfo>

            <ActionButtons>
              <SuspendButton
                variant={market.status === 'open' ? 'danger' : 'primary'}
                size="sm"
                onClick={() => handleToggle(market.id)}
              >
                {market.status === 'open' ? 'Suspend' : 'Resume'}
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
    </Container>
  );
}
