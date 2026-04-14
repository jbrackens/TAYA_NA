'use client';

import styled from 'styled-components';
import { Card } from '../shared';

const WidgetCard = styled(Card)`
  padding: 20px;
  grid-column: span 1;

  @media (max-width: 1024px) {
    grid-column: span 2;
  }

  @media (max-width: 640px) {
    grid-column: span 1;
  }
`;

const Label = styled.p`
  margin: 0 0 12px 0;
  font-size: 12px;
  color: #a0a0a0;
  text-transform: uppercase;
  font-weight: 500;
`;

const AlertsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
`;

const AlertItem = styled.div<{ $severity?: string }>`
  padding: 12px;
  background-color: #1a1f3a;
  border-left: 3px solid ${(props) => {
    switch (props.$severity) {
      case 'critical':
        return '#f87171';
      case 'high':
        return '#fb923c';
      case 'medium':
        return '#fbbf24';
      default:
        return '#4a7eff';
    }
  }};
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
`;

const AlertContent = styled.div`
  flex: 1;
`;

const AlertTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 4px;
`;

const AlertDescription = styled.p`
  margin: 0;
  font-size: 11px;
  color: #a0a0a0;
`;

const AlertTime = styled.span`
  font-size: 10px;
  color: #a0a0a0;
  white-space: nowrap;
`;

const ActionButton = styled.button`
  padding: 4px 8px;
  background-color: #4a7eff;
  color: #0b0e1c;
  border: none;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    opacity: 0.8;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 20px;
  color: #a0a0a0;
  font-size: 12px;
`;

interface RiskAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface RiskAlertsWidgetProps {
  alerts?: RiskAlert[];
}

export function RiskAlertsWidget({ alerts = [] }: RiskAlertsWidgetProps) {
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return timestamp;
    }
  };

  return (
    <WidgetCard>
      <Label>Risk Alerts</Label>

      {alerts.length > 0 ? (
        <AlertsList>
          {alerts.map((alert) => (
            <AlertItem key={alert.id} $severity={alert.severity}>
              <AlertContent>
                <AlertTitle>{alert.description}</AlertTitle>
                <AlertTime>{formatTime(alert.timestamp)}</AlertTime>
              </AlertContent>
              {alert.action && (
                <ActionButton onClick={alert.action.onClick}>{alert.action.label}</ActionButton>
              )}
            </AlertItem>
          ))}
        </AlertsList>
      ) : (
        <EmptyState>No alerts at this time</EmptyState>
      )}
    </WidgetCard>
  );
}
