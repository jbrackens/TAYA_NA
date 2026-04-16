'use client';
import {
  DashboardLayout,
  RevenueWidget,
  ActiveBetsWidget,
  LiveMatchesWidget,
  RiskAlertsWidget,
  RecentActivityWidget,
} from '../../components/dashboard';
import { ErrorBoundary, ErrorState } from '../../components/shared';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const pageTitleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  marginBottom: 24,
  color: '#ffffff',
};

const loadingShellStyle: React.CSSProperties = {
  minHeight: 400,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const loadingSpinnerStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  border: '3px solid #1a1f3a',
  borderTopColor: '#4a7eff',
  borderRadius: '50%',
  animation: 'office-dashboard-spin 0.8s linear infinite',
};

const loadingTextStyle: React.CSSProperties = {
  margin: '12px 0 0 0',
  fontSize: 14,
  color: '#a0a0a0',
  textAlign: 'center',
};

function DashboardPageContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [dashboardData, setDashboardData] = useState<{
    revenueData: {
      todayRevenue: number;
      weekRevenue: number;
      mtdRevenue: number;
      changePercent: number;
      sparklineData: number[];
    };
    activeBetsData: {
      activeBets: number;
      settledLastHour: number;
      settlementRate: number;
    };
    liveMatchesData: { sport: string; count: number }[];
    riskAlertsData: {
      id: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      timestamp: string;
      action?: { label: string; onClick: () => void };
    }[];
    recentActivityData: {
      id: string;
      actor: string;
      action: string;
      description: string;
      timestamp: string;
      icon?: string;
    }[];
  } | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const headers = { 'X-Admin-Role': 'admin' };
        const [walletResponse, auditResponse, fixturesResponse, feedResponse] =
          await Promise.all([
            fetch('/api/v1/admin/wallet/reconciliation', { headers }),
            fetch('/api/v1/admin/audit-logs?page=1&pageSize=5', { headers }),
            fetch('/api/v1/admin/trading/fixtures?page=1&pageSize=50', { headers }),
            fetch('/api/v1/admin/feed-health', { headers }),
          ]);

        if (
          !walletResponse.ok ||
          !auditResponse.ok ||
          !fixturesResponse.ok ||
          !feedResponse.ok
        ) {
          throw new Error('Failed to load dashboard');
        }

        const wallet = await walletResponse.json();
        const audit = await auditResponse.json();
        const fixtures = await fixturesResponse.json();
        const feed = await feedResponse.json();

        const fixtureItems = Array.isArray(fixtures?.items) ? fixtures.items : [];
        const auditItems = Array.isArray(audit?.items) ? audit.items : [];
        const liveMatchesBySport = fixtureItems.reduce((acc: Record<string, number>, item: any) => {
          const sport = item.sportKey || 'unknown';
          acc[sport] = (acc[sport] || 0) + 1;
          return acc;
        }, {});

        const liveMatchesData = Object.entries(liveMatchesBySport).map(([sport, count]) => ({
          sport,
          count,
        }));

        const recentActivityData = auditItems.map((item: any) => ({
          id: item.id,
          actor: item.actorId,
          action: item.action,
          description: item.details || item.targetId || 'Activity recorded',
          timestamp: item.occurredAt,
        }));

        const riskAlertsData = [
          ...(feed.summary?.hasErrors
            ? [
                {
                  id: 'feed-health-error',
                  severity: 'critical' as const,
                  description: `Feed health degraded: ${feed.summary.unhealthyStreams || 0} unhealthy streams`,
                  timestamp: new Date().toISOString(),
                  action: {
                    label: 'Inspect',
                    onClick: () => router.push('/reports'),
                  },
                },
              ]
            : []),
          ...(Number(wallet.entryCount || 0) === 0
            ? [
                {
                  id: 'wallet-empty',
                  severity: 'medium' as const,
                  description: 'No wallet reconciliation entries recorded yet',
                  timestamp: new Date().toISOString(),
                  action: {
                    label: 'View Reports',
                    onClick: () => router.push('/reports'),
                  },
                },
              ]
            : []),
        ];

        setDashboardData({
          revenueData: {
            todayRevenue: (wallet.netMovementCents || 0) / 100,
            weekRevenue: (wallet.netMovementCents || 0) / 100,
            mtdRevenue: (wallet.netMovementCents || 0) / 100,
            changePercent: 0,
            sparklineData: [
              wallet.totalCreditsCents || 0,
              wallet.totalDebitsCents || 0,
              wallet.netMovementCents || 0,
            ].map((value: number) => value / 100),
          },
          activeBetsData: {
            activeBets: Number(wallet.entryCount || 0),
            settledLastHour: 0,
            settlementRate: feed.enabled ? 100 : 0,
          },
          liveMatchesData,
          riskAlertsData,
          recentActivityData,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [reloadKey, router]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setDashboardData(null);
    setReloadKey((value) => value + 1);
  };

  if (isLoading) {
    return (
      <div>
        <h1 style={pageTitleStyle}>Dashboard</h1>
        <style>{'@keyframes office-dashboard-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
        <div style={loadingShellStyle}>
          <div>
            <div style={loadingSpinnerStyle} />
            <p style={loadingTextStyle}>Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 style={pageTitleStyle}>Dashboard</h1>
        <ErrorState
          title="Failed to load dashboard"
          message={error}
          onRetry={handleRetry}
          showRetryButton={true}
        />
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <div>
      <h1 style={pageTitleStyle}>Dashboard</h1>

      <DashboardLayout>
        <RevenueWidget {...dashboardData.revenueData} />
        <ActiveBetsWidget
          {...dashboardData.activeBetsData}
          onViewBets={() => router.push('/reports')}
        />
        <LiveMatchesWidget
          matches={dashboardData.liveMatchesData}
          onSportClick={() => router.push('/trading')}
        />
        <RiskAlertsWidget alerts={dashboardData.riskAlertsData} />
        <RecentActivityWidget activities={dashboardData.recentActivityData} />
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
