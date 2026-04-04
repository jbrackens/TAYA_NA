import React from 'react';
import styled from 'styled-components';

const ScoreContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const TeamInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const TeamName = styled.div`
  font-size: ${({ theme }) => theme.typography.base.fontSize};
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.text};
`;

const LargeScore = styled.div`
  font-size: ${({ theme }) => theme.typography.xlarge.fontSize};
  font-weight: ${({ theme }) => theme.typography.weights.bold};
  line-height: ${({ theme }) => theme.typography.xlarge.lineHeight};
  color: ${({ theme }) => theme.colors.live};
  text-align: center;
  min-width: 80px;
`;

const ScoreDivider = styled.div`
  width: 2px;
  height: 80px;
  background-color: ${({ theme }) => theme.colors.border};
`;

interface ScoreDisplayProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
}) => {
  return (
    <ScoreContainer>
      <TeamInfo>
        <TeamName>{homeTeam}</TeamName>
        <LargeScore>{homeScore}</LargeScore>
      </TeamInfo>
      <ScoreDivider />
      <TeamInfo>
        <TeamName>{awayTeam}</TeamName>
        <LargeScore>{awayScore}</LargeScore>
      </TeamInfo>
    </ScoreContainer>
  );
};

export default ScoreDisplay;
