"use client";

import styled from "styled-components";
import { Card } from "../shared";

const WidgetCard = styled(Card)`
  padding: 20px;
`;

const Label = styled.p`
  margin: 0 0 12px 0;
  font-size: 12px;
  color: var(--t2, #4a4a4a);
  text-transform: uppercase;
  font-weight: 500;
`;

const MetricValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: var(--focus-ring, #0e7a53);
  margin-bottom: 16px;
`;

const PeriodsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
`;

const PeriodRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background-color: var(--border-1, #e5dfd2);
  border-radius: 4px;
`;

const PeriodLabel = styled.span`
  font-size: 12px;
  color: var(--t2, #4a4a4a);
`;

const PeriodValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: var(--t1, #1a1a1a);
`;

const ChangeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border-1, #e5dfd2);
`;

const ChangeValue = styled.span<{ $positive?: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) =>
    props.$positive ? "var(--accent-lo, #1fa65e)" : "var(--no-text, #a8472d)"};
`;

const Sparkline = styled.svg`
  width: 100%;
  height: 40px;
  margin: 12px 0;
  stroke-width: 2;
`;

interface RevenueWidgetProps {
  todayRevenue: number;
  weekRevenue: number;
  mtdRevenue: number;
  changePercent?: number;
  sparklineData?: number[];
}

export function RevenueWidget({
  todayRevenue,
  weekRevenue,
  mtdRevenue,
  changePercent = 12,
  sparklineData = [10, 15, 12, 18, 14, 20, 16],
}: RevenueWidgetProps) {
  // Generate sparkline path
  const generateSparklinePath = (data: number[]) => {
    if (data.length === 0) return "";

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 100 / (data.length - 1 || 1);

    let path = `M 0 ${30 - ((data[0] - min) / range) * 30}`;

    for (let i = 1; i < data.length; i++) {
      const x = i * width;
      const y = 30 - ((data[i] - min) / range) * 30;
      path += ` L ${x} ${y}`;
    }

    return path;
  };

  return (
    <WidgetCard>
      <Label>Revenue</Label>
      <MetricValue>${mtdRevenue.toLocaleString()}</MetricValue>

      <Sparkline viewBox="0 0 100 30" preserveAspectRatio="none">
        <path
          d={generateSparklinePath(sparklineData)}
          stroke="var(--focus-ring, #0e7a53)"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Sparkline>

      <PeriodsContainer>
        <PeriodRow>
          <PeriodLabel>Today</PeriodLabel>
          <PeriodValue>${todayRevenue.toLocaleString()}</PeriodValue>
        </PeriodRow>
        <PeriodRow>
          <PeriodLabel>This Week</PeriodLabel>
          <PeriodValue>${weekRevenue.toLocaleString()}</PeriodValue>
        </PeriodRow>
        <PeriodRow>
          <PeriodLabel>Month to Date</PeriodLabel>
          <PeriodValue>${mtdRevenue.toLocaleString()}</PeriodValue>
        </PeriodRow>
      </PeriodsContainer>

      <ChangeContainer>
        <span style={{ fontSize: "12px", color: "var(--t2, #4a4a4a)" }}>
          vs previous period
        </span>
        <ChangeValue $positive={changePercent >= 0}>
          {changePercent >= 0 ? "+" : ""}
          {changePercent}%
        </ChangeValue>
      </ChangeContainer>
    </WidgetCard>
  );
}
