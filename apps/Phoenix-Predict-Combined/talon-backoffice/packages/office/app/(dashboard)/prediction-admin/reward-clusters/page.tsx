"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "../../../components/shared";
import { adminFetch } from "../../../lib/admin-fetch";

interface RewardClusterSummary {
  windowDate: string;
  signalType: string;
  signalHash: string;
  distinctUserCount: number;
  userIds?: string[];
}

interface RewardClusterResponse {
  items: RewardClusterSummary[];
  notes?: string[];
  total: number;
  unit: "PTS";
  windowDate: string;
}

function todayWindowDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatSignalType(value: string): string {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildQuery(windowDate: string, limit: number, format?: "csv"): string {
  const params = new URLSearchParams();
  params.set("windowDate", windowDate);
  params.set("limit", String(limit));
  if (format) params.set("format", format);
  return params.toString();
}

function bannerClassName(kind: "loading" | "error" | "empty") {
  return `rounded-xl border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] px-6 py-8 text-sm ${
    kind === "error"
      ? "text-[var(--no-text,#b4321f)]"
      : "text-[var(--t2,#4a4a4a)]"
  }`;
}

const pageTitleClassName =
  "mb-1 text-[28px] font-bold text-[var(--t1,#1a1a1a)]";
const labelClassName =
  "flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--t2,#4a4a4a)]";
const inputClassName =
  "rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] px-3 py-2 text-sm font-medium normal-case tracking-normal text-[var(--t1,#1a1a1a)]";
const tableHeaderClassName =
  "border-b border-[var(--border-1,#e5dfd2)] bg-[var(--surface-2,#fcfaf5)] p-3 text-left text-xs font-semibold uppercase tracking-[0.04em] text-[var(--t2,#4a4a4a)]";
const tableCellClassName =
  "border-b border-[var(--border-1,#e5dfd2)] p-3 align-top text-sm text-[var(--t1,#1a1a1a)]";
const monoClassName =
  "break-all font-['IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace] text-[12px] text-[var(--t1,#1a1a1a)]";

export default function RewardClusterReviewPage() {
  const [windowDate, setWindowDate] = useState(todayWindowDate);
  const [limit, setLimit] = useState(50);
  const [data, setData] = useState<RewardClusterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadClusters() {
      setLoading(true);
      setError(null);
      try {
        const query = buildQuery(windowDate, limit);
        const res = await adminFetch(
          `/api/v1/admin/wallet/reward-clusters?${query}`,
        );
        if (!res.ok) {
          throw new Error(`reward cluster review failed (${res.status})`);
        }
        const payload = (await res.json()) as RewardClusterResponse;
        if (!cancelled) setData(payload);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadClusters();
    return () => {
      cancelled = true;
    };
  }, [limit, reloadKey, windowDate]);

  async function exportCSV() {
    setExporting(true);
    setError(null);
    try {
      const query = buildQuery(windowDate, limit, "csv");
      const res = await adminFetch(
        `/api/v1/admin/wallet/reward-clusters?${query}`,
      );
      if (!res.ok) {
        throw new Error(`reward cluster export failed (${res.status})`);
      }
      const csv = await res.text();
      const url = window.URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `wallet-reward-clusters-${windowDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  }

  const items = data?.items ?? [];
  const totalUsers = items.reduce(
    (sum, item) => sum + item.distinctUserCount,
    0,
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={pageTitleClassName}>Reward Clusters</h1>
          <p className="m-0 max-w-[780px] text-sm leading-[1.5] text-[var(--t2,#4a4a4a)]">
            Review hashed reward abuse signals for gameplay point grants. Raw
            device and IP values are not returned, and this evidence is not
            point-ledger movement.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className={labelClassName}>
            Window date
            <input
              className={inputClassName}
              type="date"
              value={windowDate}
              onChange={(event) => setWindowDate(event.target.value)}
            />
          </label>
          <label className={labelClassName}>
            Limit
            <input
              className={`${inputClassName} w-[100px]`}
              min={1}
              max={200}
              type="number"
              value={limit}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isFinite(next)) {
                  setLimit(Math.max(1, Math.min(200, next)));
                }
              }}
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Refresh
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={exporting}
            onClick={exportCSV}
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      {error && (
        <div className={bannerClassName("error")}>
          Could not load reward clusters: {error}
        </div>
      )}

      {!error && loading && (
        <div className={bannerClassName("loading")}>
          Loading reward cluster evidence...
        </div>
      )}

      {!error && !loading && data && (
        <>
          <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
            <Card className="!p-[18px]">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--t2,#4a4a4a)]">
                Window
              </div>
              <div className="text-xl font-bold text-[var(--t1,#1a1a1a)]">
                {data.windowDate}
              </div>
            </Card>
            <Card className="!p-[18px]">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--t2,#4a4a4a)]">
                Clusters
              </div>
              <div className="text-xl font-bold text-[var(--focus-ring,#0e7a53)]">
                {data.total.toLocaleString()}
              </div>
            </Card>
            <Card className="!p-[18px]">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--t2,#4a4a4a)]">
                User memberships
              </div>
              <div className="text-xl font-bold text-[var(--focus-ring,#0e7a53)]">
                {totalUsers.toLocaleString()}
              </div>
            </Card>
            <Card className="!p-[18px]">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--t2,#4a4a4a)]">
                Evidence unit
              </div>
              <div className="text-xl font-bold text-[var(--t1,#1a1a1a)]">
                {data.unit}
              </div>
            </Card>
          </div>

          {data.notes && data.notes.length > 0 && (
            <div className="mb-4 rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-2,#fcfaf5)] p-4 text-sm text-[var(--t2,#4a4a4a)]">
              {data.notes.join(" ")}
            </div>
          )}

          {items.length === 0 ? (
            <div className={bannerClassName("empty")}>
              No reward clusters for this window.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full overflow-hidden rounded-xl border-collapse bg-[var(--surface-1,#ffffff)]">
                <thead>
                  <tr>
                    <th className={tableHeaderClassName}>Signal</th>
                    <th className={tableHeaderClassName}>Users</th>
                    <th className={tableHeaderClassName}>Affected user IDs</th>
                    <th className={tableHeaderClassName}>Signal hash</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={`${item.windowDate}:${item.signalType}:${item.signalHash}`}
                    >
                      <td className={tableCellClassName}>
                        {formatSignalType(item.signalType)}
                      </td>
                      <td className={tableCellClassName}>
                        {item.distinctUserCount.toLocaleString()}
                      </td>
                      <td className={`${tableCellClassName} ${monoClassName}`}>
                        {(item.userIds ?? []).join(", ") || "—"}
                      </td>
                      <td className={`${tableCellClassName} ${monoClassName}`}>
                        {item.signalHash}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
