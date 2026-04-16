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

const Timeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
`;

const TimelineItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: #1a1f3a;
  border-radius: 4px;
  border-left: 3px solid #4a7eff;
`;

const IconContainer = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(74, 126, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
`;

const ItemContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 2px;
`;

const ItemDescription = styled.p`
  margin: 0;
  font-size: 11px;
  color: #a0a0a0;
`;

const ItemTime = styled.span`
  font-size: 10px;
  color: #a0a0a0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 20px;
  color: #a0a0a0;
  font-size: 12px;
`;

interface ActivityLog {
  id: string;
  actor: string;
  action: string;
  description: string;
  timestamp: string;
  icon?: string;
}

interface RecentActivityWidgetProps {
  activities?: ActivityLog[];
}

const getActivityIcon = (action: string) => {
  switch (action) {
    case 'suspend':
      return '🔒';
    case 'settle':
      return '✓';
    case 'adjust':
      return '⚙️';
    case 'login':
      return '👤';
    default:
      return '📝';
  }
};

export function RecentActivityWidget({ activities = [] }: RecentActivityWidgetProps) {
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timestamp;
    }
  };

  return (
    <WidgetCard>
      <Label>Recent Activity</Label>

      {activities.length > 0 ? (
        <Timeline>
          {activities.map((activity) => (
            <TimelineItem key={activity.id}>
              <IconContainer>{activity.icon || getActivityIcon(activity.action)}</IconContainer>
              <ItemContent>
                <ItemTitle>
                  {activity.actor} - {activity.action}
                </ItemTitle>
                <ItemDescription>{activity.description}</ItemDescription>
                <ItemTime>{formatTime(activity.timestamp)}</ItemTime>
              </ItemContent>
            </TimelineItem>
          ))}
        </Timeline>
      ) : (
        <EmptyState>No recent activity</EmptyState>
      )}
    </WidgetCard>
  );
}
