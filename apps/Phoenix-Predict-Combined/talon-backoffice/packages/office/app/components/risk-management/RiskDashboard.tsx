"use client";

import styled from "styled-components";
import { Card, Badge } from "../shared";

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
  color: var(--t1, #1a1a1a);
`;

const ChartPlaceholder = styled.div`
  height: 200px;
  background: linear-gradient(
    135deg,
    var(--border-1, #e5dfd2) 0%,
    var(--surface-1, var(--t1, #1a1a1a)) 100%
  );
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--t2, #4a4a4a);
  font-size: 12px;
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-1, #e5dfd2);

  &:last-child {
    border-bottom: none;
  }
`;

const MetricLabel = styled.span`
  color: var(--t2, #4a4a4a);
  font-size: 12px;
`;

const MetricValue = styled.span`
  color: var(--focus-ring, #0e7a53);
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
  background-color: var(--border-1, #e5dfd2);
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const FixtureName = styled.span`
  font-size: 13px;
  color: var(--t1, #1a1a1a);
  font-weight: 500;
`;

const LiabilityBadge = styled.span<{ $high?: boolean }>`
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  background-color: ${(props) =>
    props.$high ? "rgba(248, 113, 113, 0.2)" : "rgba(74, 126, 255, 0.2)"};
  color: ${(props) =>
    props.$high ? "var(--no-text, #a8472d)" : "var(--focus-ring, #0e7a53)"};
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
          <MetricValue
            style={{
              color:
                maxExposure > 100000
                  ? "var(--no-text, #a8472d)"
                  : "var(--focus-ring, #0e7a53)",
            }}
          >
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
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "var(--t2, #4a4a4a)",
              fontSize: "12px",
            }}
          >
            No fixtures with significant liability
          </div>
        )}
      </DashboardCard>
    </DashboardGrid>
  );
}
