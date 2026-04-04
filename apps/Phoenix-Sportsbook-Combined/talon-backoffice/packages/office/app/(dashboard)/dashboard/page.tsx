'use client';

import styled from 'styled-components';
import {
  DashboardLayout,
  RevenueWidget,
  ActiveBetsWidget,
  LiveMatchesWidget,
  RiskAlertsWidget,
  RecentActivityWidget,
} from '../components/dashboard';
import { ErrorBoundary, LoadingSpinner, ErrorState } from '../components/shared';
import { useState, useEffect } from 'react';

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  color: #ffffff;
`;

function DashboardPageContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call
    setIsLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      try {
        // Replace with actual API calls:
        // const { get } = useAdminApi();
        // const data = await get('/api/admin/dashboard');
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  if (isLoading) {
    return (
      <div>
        <PageTitle>Dashboard</PageTitle>
        <LoadingSpinner centered={true} text="Loading dashboard data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageTitle>Dashboard</PageTitle>
        <ErrorState
          title="Failed to load dashboard"
          message={error}
          onRetry={handleRetry}
          showRetryButton={true}
        />
      </div>
    );
  }

  // Sample data - replace with actual API calls
  const revenueData = {
    todayRevenue: 12500,
    weekRevenue: 85000,
    mtdRevenue: 285000,
    changePercent: 12,
    sparklineData: [10, 15, 12, 18, 14, 20, 16],
  };

  const activeBetsData = {
    activeBets: 3847,
    settledLastHour: 142,
    settlementRate: 85,
  };

  const liveMatchesData = [
    { sport: 'Football', count: 24 },
    { sport: 'Basketball', count: 12 },
    { sport: 'Tennis', count: 8 },
    { sport: 'American Football', count: 4 },
  ];

  const riskAlertsData = [
    {
      id: '1',
      severity: 'high' as const,
      description: 'High stake bet on Man United vs Arsenal',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      action: { label: 'Review', onClick: () => {} },
    },
    {
      id: '2',
      severity: 'critical' as const,
      description: 'Unusual pattern detected for user #1234',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      action: { label: 'Investigate', onClick: () => {} },
    },
  ];

  const recentActivityData = [
    {
      id: '1',
      actor: 'Admin User',
      action: 'suspend',
      description: 'Suspended market for Liverpool vs Chelsea',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      icon: '🔒',
    },
    {
      id: '2',
      actor: 'System',
      action: 'settle',
      description: 'Settled 245 bets for completed matches',
      timestamp: new Date(Date.now() - 1 * 60 * 60000).toISOString(),
      icon: '✓',
    },
    {
      id: '3',
      actor: 'Risk Manager',
      action: 'adjust',
      description: 'Adjusted odds for 12 markets',
      timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
      icon: '⚙️',
    },
  ];

  return (
    <div>
      <PageTitle>Dashboard</PageTitle>

      <DashboardLayout>
        <RevenueWidget {...revenueData} />
        <ActiveBetsWidget {...activeBetsData} onViewBets={() => {}} />
        <LiveMatchesWidget matches={liveMatchesData} onSportClick={(sport) => {}} />
        <RiskAlertsWidget alerts={riskAlertsData} />
        <RecentActivityWidget activities={recentActivityData} />
      </DashboardLayout>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardPageContent />
    </ErrorBoundary>
  );
}
