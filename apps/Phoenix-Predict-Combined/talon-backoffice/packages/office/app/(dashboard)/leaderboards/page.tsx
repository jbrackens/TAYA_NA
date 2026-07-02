"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  DataTable,
  ErrorBoundary,
  ErrorState,
  SkeletonLoader,
} from "../../components/shared";
import type { ColumnDef } from "../../components/shared";
import { adminFetch } from "../../lib/admin-fetch";

interface LeaderboardRow {
  leaderboardId: string;
  slug?: string;
  name: string;
  description?: string;
  metricKey: string;
  pointMetricKey?: string;
  rankingMode: string;
  order: string;
  status: string;
  unit?: string;
  rewardSummary?: string;
  windowStartsAt?: string;
  windowEndsAt?: string;
  createdAt: string;
  updatedAt: string;
  lastComputedAt?: string;
}

function toLaunchMetricKey(value: string): string {
  return value === "net_profit_cents" ? "net_points" : value;
}

function toLegacyMetricKey(value: string): string {
  const trimmed = value.trim();
  return trimmed === "net_points" ? "net_profit_cents" : trimmed;
}

function normalizePointUnit(value?: string): string {
  const trimmed = value?.trim().toUpperCase();
  return !trimmed || trimmed === "USD" ? "PTS" : trimmed;
}

/** Format a window date pair into a short display string */
function formatWindowRange(start?: string, end?: string): string {
  if (!start && !end) return "Open-ended";
  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };
  if (start && end) return `${fmt(start)} \u2192 ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end as string)}`;
}

function LeaderboardsPageContent() {
  const router = useRouter();
  const [items, setItems] = useState<LeaderboardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isBatchRecomputing, setIsBatchRecomputing] = useState(false);
  const [recomputingId, setRecomputingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({
    slug: "",
    name: "",
    description: "",
    metricKey: "net_points",
    rankingMode: "sum",
    order: "desc",
    status: "active",
    unit: "PTS",
    rewardSummary: "",
    windowStartsAt: "",
    windowEndsAt: "",
  });

  const showFeedback = useCallback((message: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    const ts = new Date().toLocaleTimeString();
    setFeedback(`${message} (${ts})`);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimerRef.current = null;
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const loadItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      const query = params.toString();
      const response = await adminFetch(
        `/api/v1/admin/leaderboards${query ? `?${query}` : ""}`,
      );
      if (!response.ok) {
        throw new Error("Failed to load leaderboards");
      }
      const data = await response.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load leaderboards",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const recomputeAllActive = async () => {
    const activeBoards = items.filter((item) => item.status === "active");
    if (!activeBoards.length) {
      showFeedback("No active leaderboards to recompute.");
      return;
    }
    setIsBatchRecomputing(true);
    setError(null);
    setFeedback(null);
    let succeeded = 0;
    let failed = 0;
    for (const board of activeBoards) {
      try {
        const response = await adminFetch(
          `/api/v1/admin/leaderboards/${encodeURIComponent(board.leaderboardId)}/recompute`,
          {
            method: "POST",
          },
        );
        if (!response.ok) {
          failed++;
        } else {
          succeeded++;
        }
      } catch {
        failed++;
      }
    }
    await loadItems();
    setIsBatchRecomputing(false);
    const msg = failed
      ? `Recomputed ${succeeded} boards, ${failed} failed.`
      : `All ${succeeded} active boards recomputed.`;
    showFeedback(msg);
  };

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.status === "active").length,
      draft: items.filter((item) => item.status === "draft").length,
      closed: items.filter((item) => item.status === "closed").length,
    }),
    [items],
  );

  const columns: ColumnDef<LeaderboardRow>[] = [
    {
      key: "name",
      label: "Leaderboard",
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-semibold">{String(value)}</div>
          <div className="text-xs text-[var(--t3,#8b8378)]">
            {row.slug || row.pointMetricKey || toLaunchMetricKey(row.metricKey)}
          </div>
        </div>
      ),
    },
    {
      key: "rankingMode",
      label: "Mode",
      sortable: true,
      render: (value, row) =>
        `${String(value).toUpperCase()} · ${String(row.order).toUpperCase()}`,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <span className={badgeClassName(statusVariant(String(value)))}>
          {String(value).toUpperCase()}
        </span>
      ),
    },
    {
      key: "metricKey",
      label: "Metric",
      sortable: true,
      render: (value) => toLaunchMetricKey(String(value)),
    },
    {
      key: "windowStartsAt" as keyof LeaderboardRow,
      label: "Window",
      render: (_, row) => (
        <span
          className={cx(
            "text-[13px]",
            row.windowStartsAt || row.windowEndsAt
              ? "text-[var(--t1,#1a1a1a)]"
              : "text-[var(--t3,#8b8378)]",
          )}
        >
          {formatWindowRange(row.windowStartsAt, row.windowEndsAt)}
        </span>
      ),
    },
    {
      key: "lastComputedAt",
      label: "Last Recompute",
      sortable: true,
      render: (value) =>
        value ? new Date(String(value)).toLocaleString() : "Never",
    },
    {
      key: "updatedAt",
      label: "Updated",
      sortable: true,
      render: (value) => new Date(String(value)).toLocaleString(),
    },
    {
      key: "leaderboardId",
      label: "Actions",
      render: (_, row) => (
        <div className="flex flex-wrap gap-2">
          <button
            className={miniButtonClassName(false)}
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/leaderboards/${row.leaderboardId}`);
            }}
          >
            Edit
          </button>
          <button
            className={miniButtonClassName(recomputingId === row.leaderboardId)}
            disabled={recomputingId === row.leaderboardId}
            onClick={async (event) => {
              event.stopPropagation();
              setError(null);
              setFeedback(null);
              setRecomputingId(row.leaderboardId);
              try {
                const response = await adminFetch(
                  `/api/v1/admin/leaderboards/${encodeURIComponent(row.leaderboardId)}/recompute`,
                  {
                    method: "POST",
                  },
                );
                if (!response.ok) {
                  throw new Error("Failed to recompute leaderboard");
                }
                showFeedback(`${row.name} recomputed successfully.`);
                await loadItems();
              } catch (err: unknown) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Failed to recompute leaderboard",
                );
              } finally {
                setRecomputingId(null);
              }
            }}
          >
            {recomputingId === row.leaderboardId
              ? "Recomputing..."
              : "Recompute"}
          </button>
        </div>
      ),
    },
  ];

  /** Convert a datetime-local value to RFC3339 */
  const toRFC3339 = (dtLocal: string): string => {
    if (!dtLocal) return "";
    try {
      const d = new Date(dtLocal);
      if (Number.isNaN(d.getTime())) return "";
      return d.toISOString();
    } catch {
      return "";
    }
  };

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    if (!form.name.trim() || !form.metricKey.trim()) {
      setError("Name and metric key are required.");
      return;
    }
    setIsCreating(true);
    try {
      const response = await adminFetch("/api/v1/admin/leaderboards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          slug: form.slug.trim(),
          name: form.name.trim(),
          description: form.description.trim(),
          metricKey: toLegacyMetricKey(form.metricKey),
          unit: normalizePointUnit(form.unit),
          rewardSummary: form.rewardSummary.trim(),
          windowStartsAt: toRFC3339(form.windowStartsAt) || undefined,
          windowEndsAt: toRFC3339(form.windowEndsAt) || undefined,
          createdBy: "office-admin",
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create leaderboard");
      }
      const created = await response.json();
      showFeedback("Leaderboard created successfully.");
      setForm({
        slug: "",
        name: "",
        description: "",
        metricKey: "net_points",
        rankingMode: "sum",
        order: "desc",
        status: "active",
        unit: "PTS",
        rewardSummary: "",
        windowStartsAt: "",
        windowEndsAt: "",
      });
      await loadItems();
      router.push(`/leaderboards/${created.leaderboardId}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create leaderboard",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <div className={headerRowClassName}>
        <div>
          <h1 className={pageTitleClassName}>Leaderboards</h1>
          <p className={subtitleClassName}>
            Manage prediction-market leaderboards, ranking logic, and recompute
            state.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            className={batchRecomputeButtonClassName(isBatchRecomputing)}
            disabled={isBatchRecomputing}
            onClick={() => void recomputeAllActive()}
          >
            {isBatchRecomputing ? "Recomputing All..." : "Recompute All Active"}
          </button>
          <button
            className={buttonClassName()}
            onClick={() => void loadItems()}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className={metricsGridClassName}>
        <MetricCard label="Total Boards" value={stats.total.toLocaleString()} />
        <MetricCard label="Active" value={stats.active.toLocaleString()} />
        <MetricCard label="Draft" value={stats.draft.toLocaleString()} />
        <MetricCard label="Closed" value={stats.closed.toLocaleString()} />
      </div>

      <div className={formGridClassName}>
        <div className={surfaceCardClassName}>
          <h2 className={sectionTitleClassName}>Create Leaderboard</h2>
          <form className={formClassName} onSubmit={submitCreate}>
            <div className={formColumnsClassName}>
              <label className={labelClassName}>
                Name
                <input
                  className={inputClassName}
                  value={form.name}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={labelClassName}>
                Slug
                <input
                  className={inputClassName}
                  value={form.slug}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({
                      ...current,
                      slug: event.target.value,
                    }))
                  }
                  placeholder="weekly-points-race"
                />
              </label>
            </div>
            <label className={labelClassName}>
              Description
              <textarea
                className={textAreaClassName}
                value={form.description}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <div className={formColumnsClassName}>
              <label className={labelClassName}>
                Metric Key
                <input
                  className={inputClassName}
                  value={form.metricKey}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({
                      ...current,
                      metricKey: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={labelClassName}>
                Unit
                <input
                  className={inputClassName}
                  value={form.unit}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({
                      ...current,
                      unit: normalizePointUnit(event.target.value),
                    }))
                  }
                />
              </label>
            </div>
            <div className={formColumnsClassName}>
              <label className={labelClassName}>
                Ranking Mode
                <select
                  className={selectClassName}
                  value={form.rankingMode}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    setForm((current) => ({
                      ...current,
                      rankingMode: event.target.value,
                    }))
                  }
                >
                  <option value="sum">SUM</option>
                  <option value="min">MIN</option>
                  <option value="max">MAX</option>
                </select>
              </label>
              <label className={labelClassName}>
                Order
                <select
                  className={selectClassName}
                  value={form.order}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    setForm((current) => ({
                      ...current,
                      order: event.target.value,
                    }))
                  }
                >
                  <option value="desc">DESC</option>
                  <option value="asc">ASC</option>
                </select>
              </label>
              <label className={labelClassName}>
                Status
                <select
                  className={selectClassName}
                  value={form.status}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
            </div>
            <div className={formColumnsClassName}>
              <label className={labelClassName}>
                Window Start
                <input
                  type="datetime-local"
                  className={inputClassName}
                  value={form.windowStartsAt}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({
                      ...current,
                      windowStartsAt: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={labelClassName}>
                Window End
                <input
                  type="datetime-local"
                  className={inputClassName}
                  value={form.windowEndsAt}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setForm((current) => ({
                      ...current,
                      windowEndsAt: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <label className={labelClassName}>
              Reward Summary
              <input
                className={inputClassName}
                value={form.rewardSummary}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((current) => ({
                    ...current,
                    rewardSummary: event.target.value,
                  }))
                }
              />
            </label>
            {feedback ? (
              <div className={successTextClassName}>{feedback}</div>
            ) : null}
            {error ? <div className={errorTextClassName}>{error}</div> : null}
            <button
              className={buttonClassName(isCreating)}
              type="submit"
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create Leaderboard"}
            </button>
          </form>
        </div>

        <div className={surfaceCardClassName}>
          <h2 className={sectionTitleClassName}>Filters</h2>
          <div className={filtersColumnClassName}>
            <input
              className={inputClassName}
              value={search}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setSearch(event.target.value)
              }
              placeholder="Search name, slug, or description"
            />
            <select
              className={selectClassName}
              value={statusFilter}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
            </select>
            <button
              className={buttonClassName()}
              onClick={() => void loadItems()}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {error && !items.length && !isLoading ? (
        <ErrorState
          title="Failed to load leaderboards"
          message={error}
          onRetry={() => void loadItems()}
          showRetryButton={true}
        />
      ) : isLoading ? (
        <SkeletonLoader count={4} />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          pageSize={10}
          onRowClick={(row) =>
            router.push(`/leaderboards/${row.leaderboardId}`)
          }
          emptyMessage="No leaderboards match the current filters"
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

function statusVariant(status: string): "default" | "success" | "warning" {
  switch (status) {
    case "active":
      return "success";
    case "closed":
      return "warning";
    default:
      return "default";
  }
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function badgeClassName(variant: "default" | "success" | "warning") {
  const variantClasses: Record<typeof variant, string> = {
    default: "bg-[#1e3a5f] text-[#bfdbfe]",
    success: "bg-[#065f46] text-[#dcfce7]",
    warning: "bg-[#92400e] text-[#fef3c7]",
  };

  return cx(
    "inline-block rounded px-2 py-1 text-xs font-semibold",
    variantClasses[variant],
  );
}

function miniButtonClassName(disabled = false) {
  return cx(
    "rounded-md border border-[#1e3a5f] px-2.5 py-1.5 text-xs font-bold",
    disabled
      ? "cursor-not-allowed bg-[#3b4c7a] text-[#cbd5e1]"
      : "cursor-pointer bg-[var(--border-1,#e5dfd2)] text-[#93c5fd]",
  );
}

function buttonClassName(disabled = false) {
  return cx(
    "rounded border-0 px-4 py-2 text-sm font-semibold text-[var(--bg-deep,#f7f3ed)]",
    disabled
      ? "cursor-not-allowed bg-[#3b4c7a]"
      : "cursor-pointer bg-[var(--focus-ring,#0e7a53)]",
  );
}

function batchRecomputeButtonClassName(disabled = false) {
  return cx(
    "rounded border border-[#14532d] px-4 py-2 text-sm font-semibold",
    disabled
      ? "cursor-not-allowed bg-[#3b4c7a] text-[var(--t3,#8b8378)]"
      : "cursor-pointer bg-[#065f46] text-[#86efac]",
  );
}

const pageTitleClassName =
  "mb-2 text-[28px] font-bold text-[var(--t1,#1a1a1a)]";
const subtitleClassName = "m-0 text-sm text-[var(--t2,#4a4a4a)]";
const headerRowClassName = "mb-5 flex items-end justify-between gap-4";
const metricsGridClassName =
  "mb-5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4";
const formGridClassName =
  "mb-5 grid grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-5";
const surfaceCardClassName =
  "rounded-[12px] border border-[#1e2243] bg-[#111328] p-5";
const sectionTitleClassName =
  "mb-4 mt-0 text-lg font-bold text-[var(--t1,#1a1a1a)]";
const formClassName = "flex flex-col gap-[14px]";
const formColumnsClassName =
  "grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3";
const filtersColumnClassName = "flex flex-col gap-3";
const labelClassName =
  "flex flex-col gap-1.5 text-[13px] font-semibold text-[#cbd5e1]";
const inputClassName =
  "rounded-lg border border-[#263056] bg-[#0b1021] px-3 py-2.5 text-sm text-[var(--t1,#1a1a1a)]";
const selectClassName = `${inputClassName} appearance-none`;
const textAreaClassName = `${inputClassName} min-h-[84px] resize-y`;
const metricLabelClassName =
  "mb-2 text-xs uppercase tracking-[0.08em] text-[var(--t3,#8b8378)]";
const metricValueClassName = "text-[26px] font-bold text-[var(--t1,#1a1a1a)]";
const successTextClassName = "text-[13px] font-semibold text-[#86efac]";
const errorTextClassName = "text-[13px] font-semibold text-[#fca5a5]";

export default function LeaderboardsPage() {
  return (
    <ErrorBoundary>
      <LeaderboardsPageContent />
    </ErrorBoundary>
  );
}
