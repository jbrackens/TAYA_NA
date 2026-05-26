"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DataTable,
  ErrorBoundary,
  ErrorState,
  SkeletonLoader,
} from "../../components/shared";
import type { ColumnDef } from "../../components/shared";
import { adminFetch } from "../../lib/admin-fetch";

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
  const [search, setSearch] = useState("");
  const [tierCode, setTierCode] = useState("");

  const loadAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (tierCode) params.set("tierCode", tierCode);
      const query = params.toString();
      const response = await adminFetch(
        `/api/v1/admin/loyalty/accounts${query ? `?${query}` : ""}`,
      );
      if (!response.ok) {
        throw new Error("Failed to load loyalty accounts");
      }
      const data = await response.json();
      setAccounts(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load loyalty accounts",
      );
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
      totalBalance: accounts.reduce(
        (sum, account) => sum + account.pointsBalance,
        0,
      ),
      totalLifetime: accounts.reduce(
        (sum, account) => sum + account.pointsEarnedLifetime,
        0,
      ),
      vipCount: accounts.filter((account) => account.currentTier === "vip")
        .length,
    };
  }, [accounts]);

  const columns: ColumnDef<LoyaltyAccountRow>[] = [
    {
      key: "playerId",
      label: "Player",
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-semibold">{String(value)}</div>
          <div className="text-xs text-[var(--t3,#8b8378)]">
            {row.accountId}
          </div>
        </div>
      ),
    },
    {
      key: "currentTier",
      label: "Tier",
      sortable: true,
      render: (value) => (
        <span className={badgeClassName(tierVariant(String(value)))}>
          {String(value).toUpperCase()}
        </span>
      ),
    },
    {
      key: "pointsBalance",
      label: "Balance",
      sortable: true,
      render: (value) => <strong>{Number(value).toLocaleString()}</strong>,
    },
    {
      key: "pointsEarnedLifetime",
      label: "Lifetime",
      sortable: true,
      render: (value) => Number(value).toLocaleString(),
    },
    {
      key: "pointsToNextTier",
      label: "To Next Tier",
      sortable: true,
      render: (value, row) =>
        row.nextTier
          ? `${Number(value).toLocaleString()} to ${row.nextTier.toUpperCase()}`
          : "Top tier",
    },
    {
      key: "updatedAt",
      label: "Updated",
      sortable: true,
      render: (value) => new Date(String(value)).toLocaleString(),
    },
  ];

  return (
    <div>
      <div className={headerRowClassName}>
        <div>
          <h1 className={pageTitleClassName}>Loyalty</h1>
          <p className={subtitleClassName}>
            Review player rewards balances, tier position, and recent accrual
            momentum.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/loyalty/settings"
            className={`${buttonClassName} no-underline`}
          >
            Manage Rules & Tiers
          </Link>
          <button
            className={buttonClassName}
            onClick={() => void loadAccounts()}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className={metricsGridClassName}>
        <MetricCard
          label="Total Accounts"
          value={stats.totalAccounts.toLocaleString()}
        />
        <MetricCard
          label="Points In Balance"
          value={stats.totalBalance.toLocaleString()}
        />
        <MetricCard
          label="Lifetime Points"
          value={stats.totalLifetime.toLocaleString()}
        />
        <MetricCard
          label="VIP Players"
          value={stats.vipCount.toLocaleString()}
        />
      </div>

      <div className={`${surfaceCardClassName} mb-5`}>
        <div className={filtersRowClassName}>
          <input
            className={`${inputClassName} min-w-[260px] flex-[1_1_260px]`}
            value={search}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setSearch(event.target.value)
            }
            placeholder="Search by player or account id"
          />
          <select
            className={inputClassName}
            value={tierCode}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setTierCode(event.target.value)
            }
          >
            <option value="">All tiers</option>
            <option value="bronze">Bronze</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="vip">VIP</option>
          </select>
          <button
            className={buttonClassName}
            onClick={() => void loadAccounts()}
          >
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
    <div className={surfaceCardClassName}>
      <div className={metricLabelClassName}>{label}</div>
      <div className={metricValueClassName}>{value}</div>
    </div>
  );
}

function tierVariant(
  tier: string,
): "default" | "success" | "warning" | "danger" {
  switch (tier) {
    case "vip":
      return "danger";
    case "gold":
      return "warning";
    case "silver":
      return "success";
    default:
      return "default";
  }
}

function badgeClassName(
  variant: "default" | "success" | "warning" | "danger",
): string {
  const variantClassNames: Record<typeof variant, string> = {
    default: "bg-[var(--border-1,#e5dfd2)] text-[#93c5fd]",
    success: "bg-[#065f46] text-[#dcfce7]",
    warning: "bg-[#92400e] text-[#fef3c7]",
    danger: "bg-[#7f1d1d] text-[#fee2e2]",
  };
  return `inline-block rounded px-2 py-1 text-xs font-semibold ${variantClassNames[variant]}`;
}

const buttonClassName =
  "cursor-pointer rounded border-0 bg-[var(--focus-ring,#0e7a53)] px-4 py-2 text-sm font-semibold text-[var(--bg-deep,#f7f3ed)]";
const pageTitleClassName =
  "mb-2 text-[28px] font-bold text-[var(--t1,#1a1a1a)]";
const subtitleClassName = "m-0 text-sm text-[var(--t2,#4a4a4a)]";
const headerRowClassName =
  "mb-5 flex flex-wrap items-end justify-between gap-4";
const metricsGridClassName =
  "mb-6 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4";
const metricLabelClassName =
  "text-xs uppercase tracking-[0.08em] text-[var(--t3,#8b8378)]";
const metricValueClassName =
  "mt-2 text-[26px] font-bold text-[var(--t1,#1a1a1a)]";
const surfaceCardClassName =
  "rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,var(--t1,#1a1a1a))] p-4";
const filtersRowClassName = "flex flex-wrap items-center gap-3";
const inputClassName =
  "rounded border border-[var(--border-1,#e5dfd2)] bg-[var(--border-1,#e5dfd2)] px-3 py-2.5 text-sm text-[var(--t1,#1a1a1a)]";

export default function LoyaltyPage() {
  return (
    <ErrorBoundary>
      <LoyaltyPageContent />
    </ErrorBoundary>
  );
}
