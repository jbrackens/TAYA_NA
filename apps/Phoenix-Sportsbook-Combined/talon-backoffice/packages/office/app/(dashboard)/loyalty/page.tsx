'use client';

import { ChangeEvent, CSSProperties, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataTable, ErrorBoundary, ErrorState, SkeletonLoader } from '../../components/shared';
import type { ColumnDef } from '../../components/shared';

interface LoyaltyAccountRow {
  accountId: string;
  playerId: string;
  currentTier: string;
  nextTier: string;
  pointsBalance: number;
  pointsEarnedLifetime: number;
  pointsEarned7D: number;
  pointsEarned30D: number;
  pointsEarnedCurrentMonth: number;
  pointsToNextTier: number;
  updatedAt: string;
}

function LoyaltyPageContent() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<LoyaltyAccountRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tierCode, setTierCode] = useState('');

  const loadAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (tierCode) params.set('tierCode', tierCode);
      const query = params.toString();
      const response = await fetch(`/api/v1/admin/loyalty/accounts${query ? `?${query}` : ''}`, {
        headers: { 'X-Admin-Role': 'admin' },
      });
      if (!response.ok) {
        throw new Error('Failed to load loyalty accounts');
      }
      const data = await response.json();
      setAccounts(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load loyalty accounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  const stats = useMemo(() => {
    return {
      totalAccounts: accounts.length,
      totalBalance: accounts.reduce((sum, account) => sum + account.pointsBalance, 0),
      totalLifetime: accounts.reduce((sum, account) => sum + account.pointsEarnedLifetime, 0),
      vipCount: accounts.filter((account) => account.currentTier === 'vip').length,
    };
  }, [accounts]);

  const columns: ColumnDef<LoyaltyAccountRow>[] = [
    {
      key: 'playerId',
      label: 'Player',
      sortable: true,
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{String(value)}</div>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>{row.accountId}</div>
        </div>
      ),
    },
    {
      key: 'currentTier',
      label: 'Tier',
      sortable: true,
      render: (value) => (
        <span style={badgeStyle(tierVariant(String(value)))}>
          {String(value).toUpperCase()}
        </span>
      ),
    },
    {
      key: 'pointsBalance',
      label: 'Balance',
      sortable: true,
      render: (value) => <strong>{Number(value).toLocaleString()}</strong>,
    },
    {
      key: 'pointsEarnedLifetime',
      label: 'Lifetime',
      sortable: true,
      render: (value) => Number(value).toLocaleString(),
    },
    {
      key: 'pointsToNextTier',
      label: 'To Next Tier',
      sortable: true,
      render: (value, row) =>
        row.nextTier ? `${Number(value).toLocaleString()} to ${row.nextTier.toUpperCase()}` : 'Top tier',
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      sortable: true,
      render: (value) => new Date(String(value)).toLocaleString(),
    },
  ];

  return (
    <div>
      <div style={headerRowStyle}>
        <div>
          <h1 style={pageTitleStyle}>Loyalty</h1>
          <p style={subtitleStyle}>
            Review player rewards balances, tier position, and recent accrual momentum.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/loyalty/settings" style={{ ...buttonStyle(), textDecoration: 'none' }}>
            Manage Rules & Tiers
          </Link>
          <button style={buttonStyle()} onClick={() => void loadAccounts()}>
            Refresh
          </button>
        </div>
      </div>

      <div style={metricsGridStyle}>
        <MetricCard label="Total Accounts" value={stats.totalAccounts.toLocaleString()} />
        <MetricCard label="Points In Balance" value={stats.totalBalance.toLocaleString()} />
        <MetricCard label="Lifetime Points" value={stats.totalLifetime.toLocaleString()} />
        <MetricCard label="VIP Players" value={stats.vipCount.toLocaleString()} />
      </div>

      <div style={{ ...surfaceCardStyle, marginBottom: 20 }}>
        <div style={filtersRowStyle}>
          <input
            style={{ ...inputStyle, minWidth: 260, flex: '1 1 260px' }}
            value={search}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
            placeholder="Search by player or account id"
          />
          <select
            style={selectStyle}
            value={tierCode}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setTierCode(event.target.value)}
          >
            <option value="">All tiers</option>
            <option value="bronze">Bronze</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="vip">VIP</option>
          </select>
          <button style={buttonStyle()} onClick={() => void loadAccounts()}>
            Apply Filters
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState
          title="Failed to load loyalty accounts"
          message={error}
          onRetry={() => void loadAccounts()}
          showRetryButton={true}
        />
      ) : isLoading ? (
        <SkeletonLoader count={4} />
      ) : (
        <DataTable
          columns={columns}
          data={accounts}
          pageSize={12}
          onRowClick={(row) => router.push(`/loyalty/${row.playerId}`)}
          emptyMessage="No loyalty accounts match the current filters"
        />
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={surfaceCardStyle}>
      <div style={metricLabelStyle}>{label}</div>
      <div style={metricValueStyle}>{value}</div>
    </div>
  );
}

function tierVariant(tier: string): 'default' | 'success' | 'warning' | 'danger' {
  switch (tier) {
    case 'vip':
      return 'danger';
    case 'gold':
      return 'warning';
    case 'silver':
      return 'success';
    default:
      return 'default';
  }
}

function badgeStyle(variant: 'default' | 'success' | 'warning' | 'danger'): CSSProperties {
  const backgroundByVariant: Record<string, string> = {
    default: '#1a1f3a',
    success: '#065f46',
    warning: '#92400e',
    danger: '#7f1d1d',
  };
  const colorByVariant: Record<string, string> = {
    default: '#93c5fd',
    success: '#dcfce7',
    warning: '#fef3c7',
    danger: '#fee2e2',
  };
  return {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: backgroundByVariant[variant],
    color: colorByVariant[variant],
  };
}

function buttonStyle(): CSSProperties {
  return {
    padding: '8px 16px',
    backgroundColor: '#4a7eff',
    color: '#0b0e1c',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
  };
}

const pageTitleStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  marginBottom: 8,
  color: '#ffffff',
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  color: '#a0a0a0',
  fontSize: 14,
};

const headerRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-end',
  marginBottom: 20,
  flexWrap: 'wrap',
};

const metricsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 16,
  marginBottom: 24,
};

const metricLabelStyle: CSSProperties = {
  fontSize: 12,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const metricValueStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  color: '#ffffff',
  marginTop: 8,
};

const surfaceCardStyle: CSSProperties = {
  padding: 16,
  backgroundColor: '#111631',
  border: '1px solid #1a1f3a',
  borderRadius: 8,
};

const filtersRowStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'center',
};

const inputStyle: CSSProperties = {
  padding: '10px 12px',
  backgroundColor: '#1a1f3a',
  border: '1px solid #1a1f3a',
  color: '#ffffff',
  borderRadius: 4,
  fontSize: 14,
};

const selectStyle: CSSProperties = {
  padding: '10px 12px',
  backgroundColor: '#1a1f3a',
  border: '1px solid #1a1f3a',
  color: '#ffffff',
  borderRadius: 4,
  fontSize: 14,
};

export default function LoyaltyPage() {
  return (
    <ErrorBoundary>
      <LoyaltyPageContent />
    </ErrorBoundary>
  );
}
