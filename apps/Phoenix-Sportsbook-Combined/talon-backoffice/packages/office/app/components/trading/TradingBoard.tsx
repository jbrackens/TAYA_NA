'use client';

import styled from 'styled-components';
import { Badge } from '../shared';
import { useState, useEffect } from 'react';
import { useTradingWebSocket } from '../../hooks/useTradingWebSocket';

const BoardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FixtureCard = styled.div<{ $selected?: boolean }>`
  padding: 12px;
  background-color: #1a1f3a;
  border-radius: 4px;
  border: 2px solid ${(props) => (props.$selected ? '#4a7eff' : 'transparent')};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #4a7eff;
    background-color: rgba(74, 126, 255, 0.1);
  }
`;

const FixtureHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const FixtureStatus = styled.span`
  font-size: 11px;
  color: #a0a0a0;
`;

const FixtureTeams = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
`;

const TeamName = styled.span`
  font-size: 13px;
  color: #ffffff;
  font-weight: 500;
  flex: 1;
`;

const Score = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #4a7eff;
  min-width: 40px;
  text-align: center;
`;

const FixtureStats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  font-size: 11px;
  color: #a0a0a0;
`;

const StatBadge = styled.div`
  background-color: #111631;
  padding: 4px 8px;
  border-radius: 3px;
  display: flex;
  justify-content: space-between;
`;

const StatLabel = styled.span`
  color: #a0a0a0;
`;

const StatValue = styled.span`
  color: #4a7eff;
  font-weight: 600;
  margin-left: 4px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #a0a0a0;
`;

export interface FixtureData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  sport: string;
  status: 'live' | 'upcoming' | 'ended';
  marketCount: number;
  suspendedCount?: number;
  liability: number;
  exposure: number;
}

interface TradingBoardProps {
  fixtures?: FixtureData[];
  selectedFixtureId?: string;
  onFixtureSelect?: (fixture: FixtureData) => void;
}

export function TradingBoard({
  fixtures = [],
  selectedFixtureId,
  onFixtureSelect,
}: TradingBoardProps) {
  const [localFixtures, setLocalFixtures] = useState<FixtureData[]>(fixtures);
  const { isConnected, subscribe } = useTradingWebSocket({
    autoConnect: false,
  });

  useEffect(() => {
    if (fixtures.length > 0) {
      setLocalFixtures(fixtures);
    }
  }, [fixtures]);

  useEffect(() => {
    const unsubscribe = subscribe('fixtureUpdates', (data) => {
      if (Array.isArray(data)) {
        setLocalFixtures(data);
      }
    });

    return () => unsubscribe?.();
  }, [subscribe]);

  return (
    <BoardContainer>
      {localFixtures.length > 0 ? (
        localFixtures.map((fixture) => (
          <FixtureCard
            key={fixture.id}
            $selected={selectedFixtureId === fixture.id}
            onClick={() => onFixtureSelect?.(fixture)}
          >
            <FixtureHeader>
              <FixtureStatus>{fixture.sport}</FixtureStatus>
              <Badge variant={fixture.status === 'live' ? 'danger' : 'secondary'}>
                {fixture.status.toUpperCase()}
              </Badge>
            </FixtureHeader>

            <FixtureTeams>
              <TeamName>{fixture.homeTeam}</TeamName>
              {fixture.status === 'live' && (
                <>
                  <Score>{fixture.homeScore || 0}</Score>
                  <Score>-</Score>
                  <Score>{fixture.awayScore || 0}</Score>
                </>
              )}
              <TeamName>{fixture.awayTeam}</TeamName>
            </FixtureTeams>

            <FixtureStats>
              <StatBadge>
                <StatLabel>Markets:</StatLabel>
                <StatValue>{fixture.marketCount}</StatValue>
              </StatBadge>
              <StatBadge>
                <StatLabel>Exposure:</StatLabel>
                <StatValue style={{ color: fixture.exposure > 50000 ? '#f87171' : '#4a7eff' }}>
                  ${(fixture.exposure / 1000).toFixed(0)}K
                </StatValue>
              </StatBadge>
            </FixtureStats>
          </FixtureCard>
        ))
      ) : (
        <EmptyState>No fixtures available</EmptyState>
      )}
    </BoardContainer>
  );
}
