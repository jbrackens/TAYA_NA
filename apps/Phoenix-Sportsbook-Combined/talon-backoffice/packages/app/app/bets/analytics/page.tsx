'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getBetAnalytics } from '../../lib/api/betting-client';
import type { BetAnalytics } from '../../lib/api/betting-client';
import BettingHeatmap from '../../components/BettingHeatmap';
import ProtectedRoute from '../../components/ProtectedRoute';
import { colors, font, spacing, radius } from '../../lib/theme';
import { logger } from '../../lib/logger';

const AnalyticsCharts = dynamic(() => import('./AnalyticsCharts'), { ssr: false });

interface StatCardProps {
  label: string;
  value: string;
  accent?: boolean;
}

function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div className="analytics-stat-card">
      <div className="analytics-stat-label">{label}</div>
      <div className={`analytics-stat-value${accent ? ' analytics-stat-value--accent' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function AnalyticsContent() {
  const { user } = useAuth();
  const [data, setData] = useState<BetAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    getBetAnalytics(user.id)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('Analytics', 'Failed to load bet analytics', message);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [user?.id]);

  const cumulativeDailyROI = useMemo(() => {
    if (!data?.daily) return [];
    let cumStake = 0;
    let cumProfit = 0;
    return data.daily.map((d) => {
      cumStake += d.stakeCents;
      cumProfit += d.profitCents;
      const roi = cumStake > 0 ? (cumProfit / cumStake) * 100 : 0;
      return { period: d.period, roi: Math.round(roi * 100) / 100 };
    });
  }, [data?.daily]);

  const cumulativePL = useMemo(() => {
    if (!data?.daily) return [];
    let running = 0;
    return data.daily.map((d) => {
      running += d.profitCents;
      return { period: d.period, pl: running / 100 };
    });
  }, [data?.daily]);

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">Loading analytics...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="analytics-page">
        <div className="analytics-empty">Unable to load analytics data. Try again later.</div>
      </div>
    );
  }

  if (data.totalBets === 0) {
    return (
      <div className="analytics-page">
        <Link href="/bets" className="analytics-back">
          <ArrowLeft size={16} /> Back to My Bets
        </Link>
        <h1 className="analytics-title">Bet Analytics</h1>
        <div className="analytics-empty">
          No betting data yet. Place your first bet to start tracking performance.
        </div>
      </div>
    );
  }

  const profitSign = data.totalProfitCents >= 0 ? '+' : '';

  return (
    <div className="analytics-page">
      <Link href="/bets" className="analytics-back">
        <ArrowLeft size={16} /> Back to My Bets
      </Link>
      <h1 className="analytics-title">Bet Analytics</h1>
      <p className="analytics-subtitle">Performance insights across all your settled bets.</p>

      <div className="analytics-stats-grid">
        <StatCard label="Total Bets" value={data.totalBets.toLocaleString()} />
        <StatCard label="Win Rate" value={`${(data.winRate * 100).toFixed(1)}%`} />
        <StatCard label="ROI" value={`${(data.roi * 100).toFixed(1)}%`} accent />
        <StatCard label="Avg Stake" value={`$${(data.avgStakeCents / 100).toFixed(2)}`} />
        <StatCard
          label="Total P&L"
          value={`${profitSign}$${(Math.abs(data.totalProfitCents) / 100).toFixed(2)}`}
          accent={data.totalProfitCents >= 0}
        />
      </div>

      <AnalyticsCharts
        cumulativeDailyROI={cumulativeDailyROI}
        monthly={data.monthly}
        cumulativePL={cumulativePL}
        stakeBuckets={data.stakeBuckets}
      />

      <BettingHeatmap heatmap={data.heatmap} />
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: analyticsStyles }} />
      <ProtectedRoute>
        <AnalyticsContent />
      </ProtectedRoute>
    </>
  );
}

const analyticsStyles = `
  .analytics-page {
    max-width: 1000px;
    margin: 0 auto;
    padding: ${spacing['2xl']} ${spacing.lg};
  }
  .analytics-back {
    display: inline-flex;
    align-items: center;
    gap: ${spacing.sm};
    color: ${colors.primary};
    font-size: ${font.sm};
    font-weight: ${font.bold};
    text-decoration: none;
    margin-bottom: ${spacing.xl};
    transition: opacity 0.15s ease;
  }
  .analytics-back:hover { opacity: 0.8; }
  .analytics-title {
    font-size: ${font['5xl']};
    font-weight: ${font.extrabold};
    color: ${colors.textDefault};
    margin: 0 0 ${spacing.sm};
    letter-spacing: -0.03em;
  }
  .analytics-subtitle {
    color: ${colors.textSecondary};
    font-size: ${font.base};
    margin: 0 0 ${spacing['2xl']};
  }
  .analytics-loading, .analytics-empty {
    color: ${colors.textSecondary};
    font-size: ${font.lg};
    text-align: center;
    padding: ${spacing['4xl']} 0;
  }
  .analytics-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: ${spacing.md};
    margin-bottom: ${spacing['2xl']};
  }
  .analytics-stat-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: ${radius['2xl']};
    padding: ${spacing.lg};
  }
  .analytics-stat-label {
    color: ${colors.textSecondary};
    font-size: ${font.sm};
    margin-bottom: ${spacing.sm};
  }
  .analytics-stat-value {
    color: ${colors.textDefault};
    font-size: ${font['3xl']};
    font-weight: ${font.extrabold};
  }
  .analytics-stat-value--accent {
    color: ${colors.primary};
  }
  .analytics-chart-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(440px, 1fr));
    gap: ${spacing.lg};
    margin-bottom: ${spacing.lg};
  }
  @media (max-width: 640px) {
    .analytics-chart-grid { grid-template-columns: 1fr; }
  }
  .analytics-chart-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: ${radius['2xl']};
    padding: ${spacing.lg};
  }
  .analytics-chart-title {
    color: ${colors.textDefault};
    font-size: ${font.lg};
    font-weight: ${font.bold};
    margin-bottom: ${spacing.lg};
  }
`;
