'use client';

import styled from 'styled-components';
import { Card } from '../../components/shared';
import { useState, useEffect } from 'react';
import { ErrorBoundary, ErrorState } from '../../components/shared';

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  color: #ffffff;
`;

const ReportsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
`;

const ReportTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
`;

const ReportDescription = styled.p`
  margin: 0 0 16px 0;
  font-size: 13px;
  color: #a0a0a0;
  line-height: 1.5;
`;

const ReportMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #1a1f3a;
`;

const ReportDate = styled.span`
  font-size: 11px;
  color: #a0a0a0;
`;

const ChartContainer = styled(Card)`
  padding: 24px;
  margin-bottom: 24px;
`;

const ChartTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #ffffff;
`;

const ChartPlaceholder = styled.div`
  height: 300px;
  background: linear-gradient(135deg, #1a1f3a 0%, #111631 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a0a0a0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

interface Metrics {
  totalRevenue: number;
  totalBets: number;
  uniqueUsers: number;
  avgBetSize: number;
}

interface Report {
  id: string;
  title: string;
  description: string;
  type: string;
  generatedDate: string;
  period: string;
}

interface LeaderboardReportItem {
  leaderboardId: string;
  name: string;
  metricKey: string;
  rankingMode: string;
  order: string;
  status: string;
  lastComputedAt?: string;
}

interface LeaderboardStanding {
  playerId: string;
  rank: number;
  score: number;
  eventCount: number;
}

const EMPTY_METRICS: Metrics = {
  totalRevenue: 0,
  totalBets: 0,
  uniqueUsers: 0,
  avgBetSize: 0,
};

const AVAILABLE_REPORTS = [
  {
    title: 'Revenue Report',
    description: 'Comprehensive revenue analysis across all sports and markets',
    type: 'revenue',
  },
  {
    title: 'User Activity Report',
    description: 'User engagement, signup trends, and activity patterns',
    type: 'activity',
  },
  {
    title: 'Market Performance',
    description: 'Odds accuracy, hold percentage, and market efficiency',
    type: 'market',
  },
  {
    title: 'Risk Analysis',
    description: 'Liability analysis, exposure tracking, and risk metrics',
    type: 'risk',
  },
  {
    title: 'Compliance Report',
    description: 'AML/KYC compliance status and audit trail',
    type: 'compliance',
  },
  {
    title: 'Operator Summary',
    description: 'Executive summary with key performance indicators',
    type: 'summary',
  },
];

const leaderboardAnalyticsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
  gap: '20px',
} as const;

const analyticsCardStyle = {
  padding: '20px',
  background: '#111631',
  border: '1px solid #1a1f3a',
  borderRadius: '12px',
} as const;

const analyticsCardTitleStyle = {
  margin: '0 0 12px 0',
  color: '#ffffff',
  fontWeight: 600,
} as const;

const standingsListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
} as const;

const standingRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '10px 12px',
  borderRadius: '8px',
  background: '#1a1f3a',
} as const;

const reportCardStyle = {
  padding: '24px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
} as const;

const reportButtonStyle = {
  padding: '8px 14px',
  background: '#4a7eff',
  color: '#0b0e1c',
  border: '1px solid #4a7eff',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '12px',
} as const;

const secondaryButtonStyle = {
  ...reportButtonStyle,
  background: '#1a1f3a',
  color: '#4a7eff',
  border: '1px solid #4a7eff',
} as const;

const generatedReportRowStyle = {
  padding: '16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
  background: '#111631',
  border: '1px solid #1a1f3a',
  borderRadius: '12px',
} as const;

function ReportsPageContent() {
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const [reports, setReports] = useState<Report[]>([]);
  const [leaderboards, setLeaderboards] = useState<LeaderboardReportItem[]>([]);
  const [featuredLeaderboard, setFeaturedLeaderboard] = useState<LeaderboardReportItem | null>(null);
  const [featuredStandings, setFeaturedStandings] = useState<LeaderboardStanding[]>([]);
  const [activePeriod, setActivePeriod] = useState('7days');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const headers = { 'X-Admin-Role': 'admin' };
        const [walletResponse, promoResponse, feedResponse, configResponse, leaderboardResponse] =
          await Promise.all([
            fetch('/api/v1/admin/wallet/reconciliation', { headers }),
            fetch('/api/v1/admin/promotions/usage', { headers }),
            fetch('/api/v1/admin/feed-health', { headers }),
            fetch('/api/v1/admin/config', { headers }),
            fetch('/api/v1/admin/leaderboards', { headers }),
          ]);

        if (
          !walletResponse.ok ||
          !promoResponse.ok ||
          !feedResponse.ok ||
          !configResponse.ok ||
          !leaderboardResponse.ok
        ) {
          throw new Error('Failed to load reports');
        }

        const wallet = await walletResponse.json();
        const promo = await promoResponse.json();
        const feed = await feedResponse.json();
        const config = await configResponse.json();
        const leaderboardData = await leaderboardResponse.json();
        const leaderboardItems = Array.isArray(leaderboardData?.items) ? leaderboardData.items : [];
        setLeaderboards(leaderboardItems);

        const activeBoard =
          leaderboardItems.find((item: LeaderboardReportItem) => item.status === 'active') ||
          leaderboardItems[0] ||
          null;
        setFeaturedLeaderboard(activeBoard);

        if (activeBoard?.leaderboardId) {
          const standingsResponse = await fetch(
            `/api/v1/admin/leaderboards/${encodeURIComponent(activeBoard.leaderboardId)}`,
            { headers },
          );
          if (!standingsResponse.ok) {
            throw new Error('Failed to load leaderboard analytics');
          }
          const standingsData = await standingsResponse.json();
          setFeaturedStandings(
            Array.isArray(standingsData?.items) ? standingsData.items.slice(0, 5) : [],
          );
        } else {
          setFeaturedStandings([]);
        }

        const totalRevenue = (wallet.netMovementCents || 0) / 100;
        const totalBets = promo.summary?.totalBets || 0;
        const uniqueUsers = promo.summary?.uniqueUsers || wallet.distinctUserCount || 0;
        const avgBetSize =
          totalBets > 0 ? (promo.summary?.totalStakeCents || 0) / 100 / totalBets : 0;

        setMetrics({
          totalRevenue,
          totalBets,
          uniqueUsers,
          avgBetSize,
        });

        setReports([
          {
            id: 'wallet-reconciliation',
            title: 'Wallet Reconciliation Summary',
            description: `Entries: ${wallet.entryCount}, net movement ${(wallet.netMovementCents || 0) / 100}`,
            type: 'summary',
            generatedDate: new Date().toISOString(),
            period: activePeriod,
          },
          {
            id: 'promotion-usage',
            title: 'Promotion Usage Summary',
            description: `Freebet bets: ${promo.summary?.betsWithFreebet || 0}, odds boost bets: ${promo.summary?.betsWithOddsBoost || 0}`,
            type: 'compliance',
            generatedDate: new Date().toISOString(),
            period: activePeriod,
          },
          {
            id: 'feed-health',
            title: 'Feed Health Snapshot',
            description: `Provider runtime ${feed.enabled ? 'enabled' : 'disabled'}, unhealthy streams: ${feed.summary?.unhealthyStreams || 0}`,
            type: 'market',
            generatedDate: config.updatedAt || new Date().toISOString(),
            period: activePeriod,
          },
          {
            id: 'leaderboard-analytics',
            title: 'Leaderboard Analytics Summary',
            description: `Boards: ${leaderboardItems.length}, active: ${leaderboardItems.filter((item: LeaderboardReportItem) => item.status === 'active').length}`,
            type: 'activity',
            generatedDate: new Date().toISOString(),
            period: activePeriod,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reports');
      } finally {
        setIsLoading(false);
      }
    };

    loadReports();
  }, [activePeriod, reloadKey]);

  const handleGenerateReport = (reportType: string) => {
    console.log('Generate report:', reportType);
  };

  const handleViewReport = (reportId: string) => {
    console.log('View report:', reportId);
  };

  const handleDownloadReport = (reportId: string) => {
    console.log('Download report:', reportId);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setReports([]);
    setMetrics(EMPTY_METRICS);
    setReloadKey((value) => value + 1);
  };

  return (
    <div>
      <PageTitle>Reports</PageTitle>

      <ChartContainer>
        <ChartTitle>Key Metrics (Last 7 Days)</ChartTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div style={{ textAlign: 'center', padding: '16px', background: '#1a1f3a', borderRadius: '4px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#4a7eff' }}>
              ${metrics.totalRevenue.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '4px' }}>Revenue</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: '#1a1f3a', borderRadius: '4px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#4a7eff' }}>
              {metrics.totalBets.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '4px' }}>Total Bets</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: '#1a1f3a', borderRadius: '4px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#4a7eff' }}>
              {metrics.uniqueUsers.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '4px' }}>Users</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: '#1a1f3a', borderRadius: '4px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#4a7eff' }}>
              ${metrics.avgBetSize.toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '4px' }}>Avg Bet</div>
          </div>
        </div>

        <ChartPlaceholder>Chart visualization coming soon</ChartPlaceholder>
      </ChartContainer>

      <ChartContainer>
        <ChartTitle>Leaderboard Analytics</ChartTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div style={{ textAlign: 'center', padding: '16px', background: '#1a1f3a', borderRadius: '4px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#4a7eff' }}>
              {leaderboards.length.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '4px' }}>Boards</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: '#1a1f3a', borderRadius: '4px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#4a7eff' }}>
              {leaderboards.filter((board) => board.status === 'active').length.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '4px' }}>Active</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: '#1a1f3a', borderRadius: '4px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#4a7eff' }}>
              {leaderboards.filter((board) => board.status === 'draft').length.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '4px' }}>Draft</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: '#1a1f3a', borderRadius: '4px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#4a7eff' }}>
              {leaderboards.filter((board) => board.status === 'closed').length.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '4px' }}>Closed</div>
          </div>
        </div>

        <div
          style={{
            ...leaderboardAnalyticsGridStyle,
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          <div style={analyticsCardStyle}>
            <p style={analyticsCardTitleStyle}>Featured Board</p>
            {featuredLeaderboard ? (
              <>
                <p style={{ margin: '0 0 8px 0', color: '#ffffff', fontSize: '18px', fontWeight: '700' }}>
                  {featuredLeaderboard.name}
                </p>
                <p style={{ margin: '0 0 10px 0', color: '#a0a0a0', fontSize: '12px' }}>
                  {featuredLeaderboard.rankingMode.toUpperCase()} · {featuredLeaderboard.order.toUpperCase()} · {featuredLeaderboard.metricKey}
                </p>
                <p style={{ margin: '0', color: '#a0a0a0', fontSize: '12px' }}>
                  Last recompute: {featuredLeaderboard.lastComputedAt ? new Date(featuredLeaderboard.lastComputedAt).toLocaleString() : 'Never'}
                </p>
              </>
            ) : (
              <p style={{ margin: 0, color: '#a0a0a0' }}>No leaderboards available</p>
            )}
          </div>

          <div style={analyticsCardStyle}>
            <p style={analyticsCardTitleStyle}>Top Standings</p>
            {featuredStandings.length > 0 ? (
              <div style={standingsListStyle}>
                {featuredStandings.map((entry) => (
                  <div key={`${entry.playerId}-${entry.rank}`} style={standingRowStyle}>
                    <div>
                      <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '13px' }}>
                        #{entry.rank} {entry.playerId}
                      </div>
                      <div style={{ color: '#a0a0a0', fontSize: '11px', marginTop: '4px' }}>
                        {entry.eventCount} scoring events
                      </div>
                    </div>
                    <div style={{ color: '#4a7eff', fontWeight: '700', fontSize: '15px' }}>
                      {entry.score.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#a0a0a0' }}>No standings recorded yet</p>
            )}
          </div>
        </div>
      </ChartContainer>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff', marginBottom: '16px' }}>
          Period Filter
        </h2>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button
            type="button"
            style={{
              padding: '8px 16px',
              backgroundColor: activePeriod === '7days' ? '#4a7eff' : '#1a1f3a',
              color: activePeriod === '7days' ? '#0b0e1c' : '#4a7eff',
              border: `1px solid ${activePeriod === '7days' ? '#4a7eff' : '#1a1f3a'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            onClick={() => setActivePeriod('7days')}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            style={{
              padding: '8px 16px',
              backgroundColor: activePeriod === '30days' ? '#4a7eff' : '#1a1f3a',
              color: activePeriod === '30days' ? '#0b0e1c' : '#4a7eff',
              border: `1px solid ${activePeriod === '30days' ? '#4a7eff' : '#1a1f3a'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            onClick={() => setActivePeriod('30days')}
          >
            Last 30 Days
          </button>
          <button
            type="button"
            style={{
              padding: '8px 16px',
              backgroundColor: activePeriod === '90days' ? '#4a7eff' : '#1a1f3a',
              color: activePeriod === '90days' ? '#0b0e1c' : '#4a7eff',
              border: `1px solid ${activePeriod === '90days' ? '#4a7eff' : '#1a1f3a'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            onClick={() => setActivePeriod('90days')}
          >
            Last 90 Days
          </button>
          <button
            type="button"
            style={{
              padding: '8px 16px',
              backgroundColor: activePeriod === 'month' ? '#4a7eff' : '#1a1f3a',
              color: activePeriod === 'month' ? '#0b0e1c' : '#4a7eff',
              border: `1px solid ${activePeriod === 'month' ? '#4a7eff' : '#1a1f3a'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            onClick={() => setActivePeriod('month')}
          >
            This Month
          </button>
          <button
            type="button"
            style={{
              padding: '8px 16px',
              backgroundColor: activePeriod === 'year' ? '#4a7eff' : '#1a1f3a',
              color: activePeriod === 'year' ? '#0b0e1c' : '#4a7eff',
              border: `1px solid ${activePeriod === 'year' ? '#4a7eff' : '#1a1f3a'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            onClick={() => setActivePeriod('year')}
          >
            This Year
          </button>
        </div>
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff', marginBottom: '16px' }}>
        Available Reports
      </h2>
      <ReportsGrid>
        {AVAILABLE_REPORTS.map((report) => (
          <div
            key={report.type}
            style={{
              ...reportCardStyle,
              background: '#111631',
              border: '1px solid #1a1f3a',
              borderRadius: '12px',
            }}
            onClick={() => handleGenerateReport(report.type)}
          >
            <ReportTitle>{report.title}</ReportTitle>
            <ReportDescription>{report.description}</ReportDescription>

            <ReportMeta>
              <ReportDate>{new Date().toLocaleDateString()}</ReportDate>

              <ButtonGroup>
                <button type="button" style={reportButtonStyle}>
                  Generate
                </button>
              </ButtonGroup>
            </ReportMeta>
          </div>
        ))}
      </ReportsGrid>

      <div style={{ marginTop: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff', marginBottom: '16px' }}>
          Generated Reports
        </h2>
        {error ? (
          <ErrorState
            title="Failed to load reports"
            message={error}
            onRetry={handleRetry}
            showRetryButton={true}
          />
        ) : reports.length > 0 && !isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reports.map((report: Report) => (
              <div
                key={report.id}
                style={{
                  ...generatedReportRowStyle,
                  flexDirection: 'row',
                }}
              >
                <div>
                  <p style={{ margin: '0 0 4px 0', color: '#ffffff', fontWeight: '600' }}>
                    {report.title}
                  </p>
                  <p style={{ margin: '0', fontSize: '12px', color: '#a0a0a0' }}>
                    {report.period} - {new Date(report.generatedDate).toLocaleDateString()}
                  </p>
                </div>
                <ButtonGroup>
                  <button
                    type="button"
                    style={reportButtonStyle}
                    onClick={() => handleViewReport(report.id)}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => handleDownloadReport(report.id)}
                  >
                    Download
                  </button>
                </ButtonGroup>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#a0a0a0' }}>No generated reports yet</p>
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ErrorBoundary>
      <ReportsPageContent />
    </ErrorBoundary>
  );
}
