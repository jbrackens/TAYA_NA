'use client';

import styled from 'styled-components';
import { Card, Badge } from '../shared';

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
`;

const DashboardCard = styled(Card)`
  padding: 20px;
`;

const CardTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
`;

const ChartPlaceholder = styled.div`
  height: 200px;
  background: linear-gradient(135deg, #1a1f3a 0%, #111631 100%);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a0a0a0;
  font-size: 12px;
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #1a1f3a;

  &:last-child {
    border-bottom: none;
  }
`;

const MetricLabel = styled.span`
  color: #a0a0a0;
  font-size: 12px;
`;

const MetricValue = styled.span`
  color: #4a7eff;
  font-weight: 600;
  font-size: 14px;
`;

const FixtureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FixtureItem = styled.div`
  padding: 12px;
  background-color: #1a1f3a;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const FixtureName = styled.span`
  font-size: 13px;
  color: #ffffff;
  font-weight: 500;
`;

const LiabilityBadge = styled.span<{ $high?: boolean }>`
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  background-color: ${(props) => (props.$high ? 'rgba(248, 113, 113, 0.2)' : 'rgba(74, 126, 255, 0.2)')};
  color: ${(props) => (props.$high ? '#f87171' : '#4a7eff')};
`;

interface RiskDashboardProps {
  playerCount?: number;
  avgRiskScore?: number;
  totalLiability?: number;
  maxExposure?: number;
  topFixtures?: Array<{
    id: string;
    name: string;
    liability: number;
    isHighRisk?: boolean;
  }>;
}

export function RiskDashboard({
  playerCount = 0,
  avgRiskScore = 0,
  totalLiability = 0,
  maxExposure = 0,
  topFixtures = [],
}: RiskDashboardProps) {
  return (
    <DashboardGrid>
      <DashboardCard>
        <CardTitle>Player Risk Distribution</CardTitle>
        <ChartPlaceholder>Risk Score Distribution Chart</ChartPlaceholder>
      </DashboardCard>

      <DashboardCard>
        <CardTitle>Key Metrics</CardTitle>
        <MetricRow>
          <MetricLabel>Active Players</MetricLabel>
          <MetricValue>{playerCount.toLocaleString()}</MetricValue>
        </MetricRow>
        <MetricRow>
          <MetricLabel>Avg Risk Score</MetricLabel>
          <MetricValue>{avgRiskScore.toFixed(1)}</MetricValue>
        </MetricRow>
        <MetricRow>
          <MetricLabel>Total Liability</MetricLabel>
          <MetricValue>${totalLiability.toLocaleString()}</MetricValue>
        </MetricRow>
        <MetricRow>
          <MetricLabel>Max Exposure</MetricLabel>
          <MetricValue style={{ color: maxExposure > 100000 ? '#f87171' : '#4a7eff' }}>
            ${maxExposure.toLocaleString()}
          </MetricValue>
        </MetricRow>
      </DashboardCard>

      <DashboardCard>
        <CardTitle>Top Liability Fixtures</CardTitle>
        {topFixtures.length > 0 ? (
          <FixtureList>
            {topFixtures.map((fixture) => (
              <FixtureItem key={fixture.id}>
                <FixtureName>{fixture.name}</FixtureName>
                <LiabilityBadge $high={fixture.isHighRisk}>
                  ${(fixture.liability / 1000).toFixed(0)}K
                </LiabilityBadge>
              </FixtureItem>
            ))}
          </FixtureList>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#a0a0a0', fontSize: '12px' }}>
            No fixtures with significant liability
          </div>
        )}
      </DashboardCard>
    </DashboardGrid>
  );
}
