'use client';

import styled from 'styled-components';
import { Card, Button } from '../components/shared';
import { useState, useEffect } from 'react';
import { ErrorBoundary, LoadingSpinner, ErrorState } from '../components/shared';

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

const SAMPLE_METRICS: Metrics = {
  totalRevenue: 125000,
  totalBets: 45320,
  uniqueUsers: 8950,
  avgBetSize: 2.76,
};

const SAMPLE_REPORTS: Report[] = [
  {
    id: '1',
    title: 'Revenue Report - March 2024',
    description: 'Weekly breakdown of revenue',
    type: 'revenue',
    generatedDate: '2024-03-31',
    period: 'March 24-31',
  },
  {
    id: '2',
    title: 'User Activity Report - March 2024',
    description: 'Monthly engagement metrics',
    type: 'activity',
    generatedDate: '2024-03-15',
    period: 'March 1-15',
  },
];

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
  const [metrics, setMetrics] = useState<Metrics>(SAMPLE_METRICS);
  const [reports, setReports] = useState<Report[]>([]);
  const [activePeriod, setActivePeriod] = useState('7days');
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
        // const data = await get(`/api/admin/reports?period=${activePeriod}`);
        // setMetrics(data.metrics);
        // setReports(data.reports);
        setReports(SAMPLE_REPORTS);
        setMetrics(SAMPLE_METRICS);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reports');
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [activePeriod]);

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
    setTimeout(() => {
      setReports(SAMPLE_REPORTS);
      setMetrics(SAMPLE_METRICS);
      setIsLoading(false);
    }, 500);
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
