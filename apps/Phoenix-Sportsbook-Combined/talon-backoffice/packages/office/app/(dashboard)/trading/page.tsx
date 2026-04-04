'use client';

import styled from 'styled-components';
import { useState, useEffect } from 'react';
import { TradingBoard, MarketManagement } from '../components/trading';
import { ErrorBoundary, LoadingSpinner, ErrorState } from '../components/shared';

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  color: #ffffff;
`;

const TradingLayout = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

interface FixtureData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  sport: string;
  status: 'live' | 'upcoming';
  liability: number;
  exposure: number;
}

interface MarketData {
  id: string;
  name: string;
  odds: number;
  active: boolean;
}

const SAMPLE_FIXTURES: FixtureData[] = [
  {
    id: '1',
    homeTeam: 'Manchester United',
    awayTeam: 'Arsenal',
    homeScore: 2,
    awayScore: 1,
    sport: 'Football',
    status: 'live',
    liability: 15000,
    exposure: 45000,
  },
  {
    id: '2',
    homeTeam: 'Barcelona',
    awayTeam: 'Real Madrid',
    homeScore: 0,
    awayScore: 0,
    sport: 'Football',
    status: 'upcoming',
    liability: 20000,
    exposure: 60000,
  },
  {
    id: '3',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    homeScore: 85,
    awayScore: 92,
    sport: 'Basketball',
    status: 'live',
    liability: 8000,
    exposure: 25000,
  },
];

const SAMPLE_MARKETS: MarketData[] = [
  { id: '1', name: 'Match Result - 1X2', odds: 2.15, active: true },
  { id: '2', name: 'Over/Under 2.5 Goals', odds: 1.95, active: true },
  { id: '3', name: 'Both Teams to Score', odds: 1.72, active: true },
  { id: '4', name: 'Correct Score', odds: 0.00, active: false },
];

function TradingPageContent() {
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>('1');
  const [markets, setMarkets] = useState(SAMPLE_MARKETS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call
    setIsLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      try {
        // Replace with actual API call + WebSocket connection:
        // const { get } = useAdminApi();
        // const { subscribe } = useTradingWebSocket();
        // const fixtures = await get('/api/admin/fixtures');
        // subscribe((data) => { /* handle updates */ });
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trading data');
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleMarketToggle = (marketId: string) => {
    setMarkets(markets.map(m =>
      m.id === marketId ? { ...m, active: !m.active } : m
    ));
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  const selectedFixture = SAMPLE_FIXTURES.find(f => f.id === selectedFixtureId);

  if (isLoading) {
    return (
      <div>
        <PageTitle>Live Trading</PageTitle>
        <LoadingSpinner centered={true} text="Loading fixtures and markets..." />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageTitle>Live Trading</PageTitle>
        <ErrorState
          title="Failed to load trading data"
          message={error}
          onRetry={handleRetry}
          showRetryButton={true}
        />
      </div>
    );
  }

  return (
    <div>
      <PageTitle>Live Trading</PageTitle>

      <TradingLayout>
        <TradingBoard
          fixtures={SAMPLE_FIXTURES}
          selectedFixtureId={selectedFixtureId}
          onFixtureSelect={setSelectedFixtureId}
        />

        {selectedFixture && (
          <MarketManagement
            markets={markets}
            onMarketToggle={handleMarketToggle}
            onViewSelections={(marketId) => console.log('View selections for market:', marketId)}
          />
        )}
      </TradingLayout>
    </div>
  );
}

export default function TradingPage() {
  return (
    <ErrorBoundary>
      <TradingPageContent />
    </ErrorBoundary>
  );
}
