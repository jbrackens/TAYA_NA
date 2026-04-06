'use client';

import styled from 'styled-components';
import { Card, Button } from '../../components/shared';
import { useState, useEffect } from 'react';
import { ErrorBoundary, LoadingSpinner, ErrorState } from '../../components/shared';

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

const ReportCard = styled(Card)`
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
  }
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
  border-top: 1px solid #0f3460;
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
  background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a0a0a0;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const FilterButton = styled.button<{ $active?: boolean }>`
  padding: 8px 16px;
  background-color: ${props => props.$active ? '#4a7eff' : '#0f3460'};
  color: ${props => props.$active ? '#1a1a2e' : '#4a7eff'};
  border: 1px solid ${props => props.$active ? '#4a7eff' : '#0f3460'};
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background-color: #4a7eff;
    color: #1a1a2e;
  }
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

function ReportsPageContent() {
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const [reports, setReports] = useState<Report[]>([]);
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
        const [walletResponse, promoResponse, feedResponse, configResponse] =
          await Promise.all([
            fetch('/api/v1/admin/wallet/reconciliation', { headers }),
            fetch('/api/v1/admin/promotions/usage', { headers }),
            fetch('/api/v1/admin/feed-health', { headers }),
            fetch('/api/v1/admin/config', { headers }),
          ]);

        if (
          !walletResponse.ok ||
          !promoResponse.ok ||
          !feedResponse.ok ||
          !configResponse.ok
        ) {
          throw new Error('Failed to load reports');
        }

        const wallet = await walletResponse.json();
        const promo = await promoResponse.json();
        const feed = await feedResponse.json();
        const config = await configResponse.json();

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
          <div style={{ textAlign: 'center', padding: '16px', background: '#0f3460', borderRadius: '4px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#4a7eff' }}>
              ${metrics.totalRevenue.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '4px' }}>Revenue</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: '#0f3460', borderRadius: '4px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#4a7eff' }}>
              {metrics.totalBets.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '4px' }}>Total Bets</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: '#0f3460', borderRadius: '4px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#4a7eff' }}>
              {metrics.uniqueUsers.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '4px' }}>Users</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', background: '#0f3460', borderRadius: '4px' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#4a7eff' }}>
              ${metrics.avgBetSize.toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '4px' }}>Avg Bet</div>
          </div>
        </div>

        <ChartPlaceholder>Chart visualization coming soon</ChartPlaceholder>
      </ChartContainer>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff', marginBottom: '16px' }}>
          Period Filter
        </h2>
        <FilterBar>
          <FilterButton $active={activePeriod === '7days'} onClick={() => setActivePeriod('7days')}>
            Last 7 Days
          </FilterButton>
          <FilterButton $active={activePeriod === '30days'} onClick={() => setActivePeriod('30days')}>
            Last 30 Days
          </FilterButton>
          <FilterButton $active={activePeriod === '90days'} onClick={() => setActivePeriod('90days')}>
            Last 90 Days
          </FilterButton>
          <FilterButton $active={activePeriod === 'month'} onClick={() => setActivePeriod('month')}>
            This Month
          </FilterButton>
          <FilterButton $active={activePeriod === 'year'} onClick={() => setActivePeriod('year')}>
            This Year
          </FilterButton>
        </FilterBar>
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#ffffff', marginBottom: '16px' }}>
        Available Reports
      </h2>
      <ReportsGrid>
        {AVAILABLE_REPORTS.map((report) => (
          <ReportCard key={report.type} onClick={() => handleGenerateReport(report.type)}>
            <ReportTitle>{report.title}</ReportTitle>
            <ReportDescription>{report.description}</ReportDescription>

            <ReportMeta>
              <ReportDate>{new Date().toLocaleDateString()}</ReportDate>

              <ButtonGroup>
                <Button variant="primary" size="sm">
                  Generate
                </Button>
              </ButtonGroup>
            </ReportMeta>
          </ReportCard>
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
              <Card key={report.id} style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', color: '#ffffff', fontWeight: '600' }}>
                    {report.title}
                  </p>
                  <p style={{ margin: '0', fontSize: '12px', color: '#a0a0a0' }}>
                    {report.period} - {new Date(report.generatedDate).toLocaleDateString()}
                  </p>
                </div>
                <ButtonGroup>
                  <Button variant="primary" size="sm" onClick={() => handleViewReport(report.id)}>
                    View
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleDownloadReport(report.id)}>
                    Download
                  </Button>
                </ButtonGroup>
              </Card>
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
