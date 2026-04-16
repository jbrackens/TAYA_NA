import React from 'react';
import styled from 'styled-components';
import Card from './Card';
import Badge from './Badge';
import OddsButton from './OddsButton';

const MatchCardContainer = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const MatchHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StatusBadgeContainer = styled.div`
  flex-shrink: 0;
`;

const ScoreSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const TeamScore = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const TeamName = styled.div`
  font-size: ${({ theme }) => theme.typography.base.fontSize};
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const Score = styled.div`
  font-size: ${({ theme }) => theme.typography.xlarge.fontSize};
  font-weight: ${({ theme }) => theme.typography.weights.bold};
  color: ${({ theme }) => theme.colors.live};
`;

const ScoreDivider = styled.div`
  width: 2px;
  height: 100px;
  background-color: ${({ theme }) => theme.colors.border};
`;

const QuickBetRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

interface MatchCardProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'live' | 'finished' | 'upcoming' | 'cancelled';
  homeOdds?: number;
  drawOdds?: number;
  awayOdds?: number;
  onBetHome?: () => void;
  onBetDraw?: () => void;
  onBetAway?: () => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  status,
  homeOdds = 2.1,
  drawOdds = 3.2,
  awayOdds = 2.8,
  onBetHome,
  onBetDraw,
  onBetAway,
}) => {
  return (
    <MatchCardContainer>
      <MatchHeader>
        <div />
        <StatusBadgeContainer>
          <Badge variant={status}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </StatusBadgeContainer>
      </MatchHeader>

      <ScoreSection>
        <TeamScore>
          <TeamName>{homeTeam}</TeamName>
          <Score>{homeScore}</Score>
        </TeamScore>
        <ScoreDivider />
        <TeamScore>
          <TeamName>{awayTeam}</TeamName>
          <Score>{awayScore}</Score>
        </TeamScore>
      </ScoreSection>

      {status !== 'cancelled' && (
        <QuickBetRow>
          <OddsButton odds={homeOdds} onClick={onBetHome} />
          {drawOdds && <OddsButton odds={drawOdds} onClick={onBetDraw} />}
          <OddsButton odds={awayOdds} onClick={onBetAway} />
        </QuickBetRow>
      )}
    </MatchCardContainer>
  );
};

export default MatchCard;
