'use client';

import { ChangeEvent, CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, ErrorBoundary, ErrorState, SkeletonLoader } from '../../components/shared';
import type { ColumnDef } from '../../components/shared';

interface LeaderboardRow {
  leaderboardId: string;
  slug?: string;
  name: string;
  description?: string;
  metricKey: string;
  rankingMode: string;
  order: string;
  status: string;
  currency?: string;
  prizeSummary?: string;
  createdAt: string;
  updatedAt: string;
  lastComputedAt?: string;
}

function LeaderboardsPageContent() {
  const router = useRouter();
  const [items, setItems] = useState<LeaderboardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({
    slug: '',
    name: '',
    description: '',
    metricKey: 'net_profit_cents',
    rankingMode: 'sum',
    order: 'desc',
    status: 'active',
    currency: 'USD',
    prizeSummary: '',
  });

  const loadItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      const query = params.toString();
      const response = await fetch(`/api/v1/admin/leaderboards${query ? `?${query}` : ''}`, {
        headers: { 'X-Admin-Role': 'admin' },
      });
      if (!response.ok) {
        throw new Error('Failed to load leaderboards');
      }
      const data = await response.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboards');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((item) => item.status === 'active').length,
    draft: items.filter((item) => item.status === 'draft').length,
    closed: items.filter((item) => item.status === 'closed').length,
  }), [items]);

  const columns: ColumnDef<LeaderboardRow>[] = [
    {
      key: 'name',
      label: 'Leaderboard',
      sortable: true,
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{String(value)}</div>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>
            {row.slug || row.metricKey}
          </div>
        </div>
      ),
    },
    {
      key: 'rankingMode',
      label: 'Mode',
      sortable: true,
      render: (value, row) => `${String(value).toUpperCase()} · ${String(row.order).toUpperCase()}`,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => <span style={badgeStyle(statusVariant(String(value)))}>{String(value).toUpperCase()}</span>,
    },
    {
      key: 'metricKey',
      label: 'Metric',
      sortable: true,
    },
    {
      key: 'lastComputedAt',
      label: 'Last Recompute',
      sortable: true,
      render: (value) => value ? new Date(String(value)).toLocaleString() : 'Never',
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      sortable: true,
      render: (value) => new Date(String(value)).toLocaleString(),
    },
  ];

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    if (!form.name.trim() || !form.metricKey.trim()) {
      setError('Name and metric key are required.');
      return;
    }
    setIsCreating(true);
    try {
      const response = await fetch('/api/v1/admin/leaderboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Role': 'admin',
        },
        body: JSON.stringify({
          ...form,
          slug: form.slug.trim(),
          name: form.name.trim(),
          description: form.description.trim(),
          metricKey: form.metricKey.trim(),
          prizeSummary: form.prizeSummary.trim(),
          createdBy: 'office-admin',
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create leaderboard');
      }
      const created = await response.json();
      setFeedback('Leaderboard created successfully.');
      setForm({
        slug: '',
        name: '',
        description: '',
        metricKey: 'net_profit_cents',
        rankingMode: 'sum',
        order: 'desc',
        status: 'active',
        currency: 'USD',
        prizeSummary: '',
      });
      await loadItems();
      router.push(`/leaderboards/${created.leaderboardId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create leaderboard');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <div style={headerRowStyle}>
        <div>
          <h1 style={pageTitleStyle}>Leaderboards</h1>
          <p style={subtitleStyle}>
            Manage sportsbook competitions, ranking logic, and recompute state.
          </p>
        </div>
        <button style={buttonStyle()} onClick={() => void loadItems()}>
          Refresh
        </button>
      </div>

      <div style={metricsGridStyle}>
        <MetricCard label="Total Boards" value={stats.total.toLocaleString()} />
        <MetricCard label="Active" value={stats.active.toLocaleString()} />
        <MetricCard label="Draft" value={stats.draft.toLocaleString()} />
        <MetricCard label="Closed" value={stats.closed.toLocaleString()} />
      </div>

      <div style={formGridStyle}>
        <div style={surfaceCardStyle}>
          <h2 style={sectionTitleStyle}>Create Leaderboard</h2>
          <form style={formStyle} onSubmit={submitCreate}>
            <div style={formColumnsStyle}>
              <label style={labelStyle}>
                Name
                <input style={inputStyle} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label style={labelStyle}>
                Slug
                <input style={inputStyle} value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} placeholder="weekly-profit-race" />
              </label>
            </div>
            <label style={labelStyle}>
              Description
              <textarea style={textAreaStyle} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <div style={formColumnsStyle}>
              <label style={labelStyle}>
                Metric Key
                <input style={inputStyle} value={form.metricKey} onChange={(event) => setForm((current) => ({ ...current, metricKey: event.target.value }))} />
              </label>
              <label style={labelStyle}>
                Currency
                <input style={inputStyle} value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} />
              </label>
            </div>
            <div style={formColumnsStyle}>
              <label style={labelStyle}>
                Ranking Mode
                <select style={selectStyle} value={form.rankingMode} onChange={(event) => setForm((current) => ({ ...current, rankingMode: event.target.value }))}>
                  <option value="sum">SUM</option>
                  <option value="min">MIN</option>
                  <option value="max">MAX</option>
                </select>
              </label>
              <label style={labelStyle}>
                Order
                <select style={selectStyle} value={form.order} onChange={(event) => setForm((current) => ({ ...current, order: event.target.value }))}>
                  <option value="desc">DESC</option>
                  <option value="asc">ASC</option>
                </select>
              </label>
              <label style={labelStyle}>
                Status
                <select style={selectStyle} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
            </div>
            <label style={labelStyle}>
              Prize Summary
              <input style={inputStyle} value={form.prizeSummary} onChange={(event) => setForm((current) => ({ ...current, prizeSummary: event.target.value }))} />
            </label>
            {feedback ? <div style={successTextStyle}>{feedback}</div> : null}
            {error ? <div style={errorTextStyle}>{error}</div> : null}
            <button style={buttonStyle(isCreating)} type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Leaderboard'}
            </button>
          </form>
        </div>

        <div style={surfaceCardStyle}>
          <h2 style={sectionTitleStyle}>Filters</h2>
          <div style={filtersColumnStyle}>
            <input
              style={inputStyle}
              value={search}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
              placeholder="Search name, slug, or description"
            />
            <select style={selectStyle} value={statusFilter} onChange={(event: ChangeEvent<HTMLSelectElement>) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
            </select>
            <button style={buttonStyle()} onClick={() => void loadItems()}>
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {error && !items.length && !isLoading ? (
        <ErrorState title="Failed to load leaderboards" message={error} onRetry={() => void loadItems()} showRetryButton={true} />
      ) : isLoading ? (
        <SkeletonLoader count={4} />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          pageSize={10}
          onRowClick={(row) => router.push(`/leaderboards/${row.leaderboardId}`)}
          emptyMessage="No leaderboards match the current filters"
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

function statusVariant(status: string): 'default' | 'success' | 'warning' {
  switch (status) {
    case 'active':
      return 'success';
    case 'closed':
      return 'warning';
    default:
      return 'default';
  }
}

function badgeStyle(variant: 'default' | 'success' | 'warning'): CSSProperties {
  const backgrounds: Record<string, string> = {
    default: '#1e3a5f',
    success: '#065f46',
    warning: '#92400e',
  };
  const colors: Record<string, string> = {
    default: '#bfdbfe',
    success: '#dcfce7',
    warning: '#fef3c7',
  };
  return {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: backgrounds[variant],
    color: colors[variant],
  };
}

function buttonStyle(disabled = false): CSSProperties {
  return {
    padding: '8px 16px',
    backgroundColor: disabled ? '#3b4c7a' : '#4a7eff',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    fontSize: 14,
  };
}

const pageTitleStyle: CSSProperties = { fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#ffffff' };
const subtitleStyle: CSSProperties = { margin: 0, color: '#a0a0a0', fontSize: 14 };
const headerRowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-end', marginBottom: 20 };
const metricsGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 };
const formGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 20, marginBottom: 20 };
const surfaceCardStyle: CSSProperties = { background: '#111328', border: '1px solid #1e2243', borderRadius: 12, padding: 20 };
const sectionTitleStyle: CSSProperties = { fontSize: 18, fontWeight: 700, color: '#ffffff', marginTop: 0, marginBottom: 16 };
const formStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14 };
const formColumnsStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 };
const filtersColumnStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };
const labelStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, color: '#cbd5e1', fontSize: 13, fontWeight: 600 };
const inputStyle: CSSProperties = { background: '#0b1021', border: '1px solid #263056', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: 14 };
const selectStyle: CSSProperties = { ...inputStyle, appearance: 'none' };
const textAreaStyle: CSSProperties = { ...inputStyle, minHeight: 84, resize: 'vertical' };
const metricLabelStyle: CSSProperties = { color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 };
const metricValueStyle: CSSProperties = { color: '#ffffff', fontSize: 26, fontWeight: 700 };
const successTextStyle: CSSProperties = { color: '#86efac', fontSize: 13, fontWeight: 600 };
const errorTextStyle: CSSProperties = { color: '#fca5a5', fontSize: 13, fontWeight: 600 };

export default function LeaderboardsPage() {
  return (
    <ErrorBoundary>
      <LeaderboardsPageContent />
    </ErrorBoundary>
  );
}
