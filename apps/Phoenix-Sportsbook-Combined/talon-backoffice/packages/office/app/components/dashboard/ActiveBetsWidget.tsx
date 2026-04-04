'use client';

import styled from 'styled-components';
import { Card } from '../shared';

const WidgetCard = styled(Card)`
  padding: 20px;
`;

const Label = styled.p`
  margin: 0 0 12px 0;
  font-size: 12px;
  color: #a0a0a0;
  text-transform: uppercase;
  font-weight: 500;
`;

const MetricValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: #4a7eff;
  margin-bottom: 16px;
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background-color: #0f3460;
  border-radius: 4px;
  margin-bottom: 12px;
`;

const StatLabel = styled.span`
  font-size: 12px;
  color: #a0a0a0;
`;

const StatValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
`;

const QuickLinkButton = styled.button`
  width: 100%;
  padding: 8px;
  background-color: #4a7eff;
  color: #1a1a2e;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.8;
  }

  &:active {
    transform: scale(0.98);
  }
`;

interface ActiveBetsWidgetProps {
  activeBets: number;
  settledLastHour: number;
  settlementRate: number;
  onViewBets?: () => void;
}

export function ActiveBetsWidget({
  activeBets,
  settledLastHour,
  settlementRate,
  onViewBets,
}: ActiveBetsWidgetProps) {
  return (
    <WidgetCard>
      <Label>Active Bets</Label>
      <MetricValue>{activeBets.toLocaleString()}</MetricValue>

      <StatRow>
        <StatLabel>Settled Last Hour</StatLabel>
        <StatValue>{settledLastHour}</StatValue>
      </StatRow>

      <StatRow>
        <StatLabel>Settlement Rate</StatLabel>
        <StatValue style={{ color: settlementRate > 80 ? '#22c55e' : settlementRate > 50 ? '#fbbf24' : '#f87171' }}>
          {settlementRate}%
        </StatValue>
      </StatRow>

      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #0f3460' }}>
        <QuickLinkButton onClick={onViewBets}>View All Bets</QuickLinkButton>
      </div>
    </WidgetCard>
  );
}
