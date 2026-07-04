"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "../../../lib/admin-fetch";
import {
  Card,
  DataTable,
  ErrorBoundary,
  ErrorState,
  LoadingSpinner,
  type ColumnDef,
} from "../../../components/shared";

// Finance reports dashboard (PAM §23 Reporting, Dashboards, and Exports;
// Scenario 15). Surfaces the statutory daily-balance / transaction-summary
// report and the period reconciliation totals over the point ledger, plus a
// date-scoped wallet-ledger CSV export. All three sources are the gateway
// reporting endpoints (finances:read); this page only reads them.

interface DailyBalanceRow extends Record<string, unknown> {
  date: string;
  creditsCents: number;
  debitsCents: number;
  netCents: number;
  entryCount: number;
  distinctUsers: number;
}

interface DailyBalanceResponse {
  unit: string;
  days: DailyBalanceRow[];
}

interface Reconciliation {
  totalCreditPointsCents: number;
  totalDebitPointsCents: number;
  netMovementPointsCents: number;
  entryCount: number;
  distinctUserCount: number;
  unit: string;
}

function fmtPts(cents: number): string {
  return `${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} PTS`;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function FinanceReportsContent() {
  const [from, setFrom] = useState<string>(isoDaysAgo(30));
  const [to, setTo] = useState<string>(isoDaysAgo(0));
  const [days, setDays] = useState<DailyBalanceRow[]>([]);
  const [recon, setRecon] = useState<Reconciliation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  }, [from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [balRes, reconRes] = await Promise.all([
        adminFetch(`/api/v1/admin/reports/daily-balance?${query}`),
        adminFetch(`/api/v1/admin/wallet/reconciliation?${query}`),
      ]);
      if (!balRes.ok)
        throw new Error(`daily balance request failed (${balRes.status})`);
      if (!reconRes.ok)
        throw new Error(`reconciliation request failed (${reconRes.status})`);
      const bal = (await balRes.json()) as DailyBalanceResponse;
      const rec = (await reconRes.json()) as Reconciliation;
      setDays(bal.days ?? []);
      setRecon(rec);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnDef<DailyBalanceRow>[] = [
    { key: "date", label: "Date", sortable: true },
    {
      key: "creditsCents",
      label: "Credits",
      sortable: true,
      render: (v) => fmtPts(v as number),
    },
    {
      key: "debitsCents",
      label: "Debits",
      sortable: true,
      render: (v) => fmtPts(v as number),
    },
    {
      key: "netCents",
      label: "Net movement",
      sortable: true,
      render: (v) => fmtPts(v as number),
    },
    { key: "entryCount", label: "Entries", sortable: true },
    { key: "distinctUsers", label: "Distinct users", sortable: true },
  ];

  const summary: { label: string; value: string }[] = recon
    ? [
        { label: "Total credits", value: fmtPts(recon.totalCreditPointsCents) },
        { label: "Total debits", value: fmtPts(recon.totalDebitPointsCents) },
        { label: "Net movement", value: fmtPts(recon.netMovementPointsCents) },
        { label: "Ledger entries", value: recon.entryCount.toLocaleString() },
        {
          label: "Distinct users",
          value: recon.distinctUserCount.toLocaleString(),
        },
      ]
    : [];

  const csvHref = `/api/v1/admin/reports/wallet-ledger.csv?${query}`;

  return (
    <div className="space-y-6" data-testid="finance-reports-page">
      <div>
        <h1 className="font-['Inter',sans-serif] text-2xl font-semibold text-[var(--t1,#1a1a1a)]">
          Finance Reports
        </h1>
        <p className="mt-1 text-sm text-[var(--t2,#4a4a4a)]">
          Daily balance and period reconciliation over the point ledger. Reads
          are permission-gated (finances:read); the CSV export is recorded in
          the audit log.
        </p>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--t2,#4a4a4a)]">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] px-3 py-2 text-sm text-[var(--t1,#1a1a1a)]"
              data-testid="finance-reports-from"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--t2,#4a4a4a)]">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] px-3 py-2 text-sm text-[var(--t1,#1a1a1a)]"
              data-testid="finance-reports-to"
            />
          </label>
          <a
            href={csvHref}
            className="inline-flex items-center rounded-lg bg-[var(--focus-ring,#0e7a53)] px-4 py-2 text-sm font-semibold text-[var(--bg-deep,#f7f3ed)]"
            data-testid="finance-reports-csv"
            download
          >
            Download wallet-ledger CSV
          </a>
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : (
        <>
          <div
            className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5"
            data-testid="finance-reports-summary"
          >
            {summary.map((s) => (
              <Card key={s.label} className="p-4">
                <p className="m-0 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--t2,#4a4a4a)]">
                  {s.label}
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--t1,#1a1a1a)]">
                  {s.value}
                </p>
              </Card>
            ))}
          </div>

          <Card className="p-5">
            <h2 className="m-0 mb-3 text-base font-semibold text-[var(--t1,#1a1a1a)]">
              Daily balance
            </h2>
            <DataTable
              columns={columns}
              data={days}
              pageSize={15}
              emptyMessage="No ledger movement in this period."
            />
          </Card>
        </>
      )}
    </div>
  );
}

export default function FinanceReportsPage() {
  return (
    <ErrorBoundary>
      <FinanceReportsContent />
    </ErrorBoundary>
  );
}
