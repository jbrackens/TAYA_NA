'use client';

import styled from 'styled-components';
import { RiskDashboard, PlayerRiskTable } from '../components/risk-management';
import { ErrorBoundary, LoadingSpinner, ErrorState, SkeletonLoader } from '../components/shared';
import { useState, useEffect } from 'react';

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  color: #ffffff;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin: 24px 0 16px 0;
  color: #ffffff;
`;

interface PlayerRiskData {
  id: string;
  name: string;
  email: string;
  riskScore: number;
  segment: 'low' | 'medium' | 'high';
  totalBets: number;
  profit: number;
  lastActivity: string;
}

const SAMPLE_PLAYERS: PlayerRiskData[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    riskScore: 25,
    segment: 'low',
    totalBets: 245,
    profit: 1250,
    lastActivity: '2024-04-01',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    riskScore: 65,
    segment: 'medium',
    totalBets: 156,
    profit: -450,
    lastActivity: '2024-03-31',
  },
  {
    id: '3',
    name: 'High Roller',
    email: 'roller@example.com',
    riskScore: 92,
    segment: 'high',
    totalBets: 512,
    profit: -8900,
    lastActivity: '2024-04-01',
  },
];

const SAMPLE_TOP_FIXTURES = [
  { id: '1', name: 'Man United vs Arsenal', liability: 45000, isHighRisk: false },
  { id: '2', name: 'Barcelona vs Real Madrid', liability: 62000, isHighRisk: true },
  { id: '3', name: 'Lakers vs Celtics', liability: 28000, isHighRisk: false },
];

function RiskManagementPageContent() {
  const [players, setPlayers] = useState<PlayerRiskData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call
    setIsLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      try {
        // Replace with actual API call:
        // const { get } = useAdminApi();
        // const data = await get('/api/admin/risk-metrics');
        // setPlayers(data);
        setPlayers(SAMPLE_PLAYERS);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load risk data');
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handlePlayerClick = (player: PlayerRiskData) => {
    console.log('Selected player:', player);
    // Could navigate to player detail page
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      setPlayers(SAMPLE_PLAYERS);
      setIsLoading(false);
    }, 500);
  };

  return (
    <div>
      <PageTitle>Risk Management</PageTitle>

      <RiskDashboard
        playerCount={324}
        avgRiskScore={52.4}
        totalLiability={892500}
        maxExposure={125000}
        topFixtures={SAMPLE_TOP_FIXTURES}
      />

      <SectionTitle>Player Risk Scores</SectionTitle>
      {error ? (
        <ErrorState
          title="Failed to load player risk data"
          message={error}
          onRetry={handleRetry}
          showRetryButton={true}
        />
      ) : isLoading ? (
        <SkeletonLoader count={3} />
      ) : (
        <PlayerRiskTable
          players={players}
          onPlayerClick={handlePlayerClick}
          isLoading={false}
        />
      )}
    </div>
  );
}

export default function RiskManagementPage() {
  return (
    <ErrorBoundary>
      <RiskManagementPageContent />
    </ErrorBoundary>
  );
}
