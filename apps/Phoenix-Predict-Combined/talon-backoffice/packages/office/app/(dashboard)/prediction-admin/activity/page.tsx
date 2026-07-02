"use client";

import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { Button, Card } from "../../../components/shared";
import { adminFetch } from "../../../lib/admin-fetch";

interface ActivityItem {
  id: string;
  type: string;
  userId: string;
  targetId?: string;
  marketId?: string;
  commentId?: string;
  body?: string;
  createdAt: string;
}

interface ActivityResponse {
  items: ActivityItem[];
  total: number;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatActivityType(value: string): string {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildQuery(limit: number, format?: "csv"): string {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (format) params.set("format", format);
  return params.toString();
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

function bannerClassName(kind: "loading" | "error" | "empty") {
  return `rounded-xl border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] px-6 py-8 text-sm ${
    kind === "error"
      ? "text-[var(--no-text,#b4321f)]"
      : "text-[var(--t2,#4a4a4a)]"
  }`;
}

export default function PredictionActivityExportPage() {
  const [limit, setLimit] = useState(100);
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadActivity() {
      setLoading(true);
      setError(null);
      try {
        const query = buildQuery(limit);
        const res = await adminFetch(`/api/v1/admin/social/activity?${query}`);
        if (!res.ok) {
          throw new Error(`activity export review failed (${res.status})`);
        }
        const payload = (await res.json()) as ActivityResponse;
        if (!cancelled) setData(payload);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadActivity();
    return () => {
      cancelled = true;
    };
  }, [limit, reloadKey]);

  async function exportCSV() {
    setExporting(true);
    setError(null);
    try {
      const query = buildQuery(limit, "csv");
      const res = await adminFetch(`/api/v1/admin/social/activity?${query}`);
      if (!res.ok) {
        throw new Error(`activity export failed (${res.status})`);
      }
      const csv = await res.text();
      const url = window.URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "prediction-social-activity.csv";
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
  const typeCounts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={pageTitleClassName}>Activity Export</h1>
          <p className="m-0 max-w-[760px] text-sm leading-[1.5] text-[var(--t2,#4a4a4a)]">
            Review the prediction activity feed across comments, follows,
            trades, settlements, rewards, and leaderboard movement.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
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
            <ReloadOutlined aria-hidden="true" />
            Refresh
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={exporting}
            onClick={exportCSV}
          >
            <DownloadOutlined aria-hidden="true" />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      {error && (
        <div className={bannerClassName("error")}>
          Could not load activity export: {error}
        </div>
      )}

      {!error && loading && (
        <div className={bannerClassName("loading")}>
          Loading prediction activity...
        </div>
      )}

      {!error && !loading && data && (
        <>
          <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
            <Card className="!p-[18px]">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--t2,#4a4a4a)]">
                Rows
              </div>
              <div className="text-xl font-bold text-[var(--focus-ring,#0e7a53)]">
                {data.total.toLocaleString()}
              </div>
            </Card>
            <Card className="!p-[18px]">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--t2,#4a4a4a)]">
                Activity types
              </div>
              <div className="text-xl font-bold text-[var(--focus-ring,#0e7a53)]">
                {Object.keys(typeCounts).length.toLocaleString()}
              </div>
            </Card>
            <Card className="!p-[18px]">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--t2,#4a4a4a)]">
                Export file
              </div>
              <div className="text-xl font-bold text-[var(--t1,#1a1a1a)]">
                CSV
              </div>
            </Card>
          </div>

          {items.length === 0 ? (
            <div className={bannerClassName("empty")}>
              No activity rows found.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full overflow-hidden rounded-xl border-collapse bg-[var(--surface-1,#ffffff)]">
                <thead>
                  <tr>
                    <th className={tableHeaderClassName}>Type</th>
                    <th className={tableHeaderClassName}>Actor</th>
                    <th className={tableHeaderClassName}>Market</th>
                    <th className={tableHeaderClassName}>Body</th>
                    <th className={tableHeaderClassName}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      className="transition-colors duration-200 ease-[ease] hover:bg-[var(--surface-2,#fcfaf5)]"
                      key={item.id}
                    >
                      <td className={tableCellClassName}>
                        {formatActivityType(item.type)}
                      </td>
                      <td className={tableCellClassName}>
                        <span className={monoClassName}>{item.userId}</span>
                        {item.targetId && (
                          <div className="mt-1 text-xs text-[var(--t3,#8b8378)]">
                            Target{" "}
                            <span className={monoClassName}>
                              {item.targetId}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className={tableCellClassName}>
                        {item.marketId ? (
                          <span className={monoClassName}>{item.marketId}</span>
                        ) : (
                          <span className="text-[var(--t3,#8b8378)]">-</span>
                        )}
                        {item.commentId && (
                          <div className="mt-1 text-xs text-[var(--t3,#8b8378)]">
                            Comment{" "}
                            <span className={monoClassName}>
                              {item.commentId}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className={tableCellClassName}>
                        <div className="max-w-[420px] whitespace-pre-wrap break-words">
                          {item.body || "-"}
                        </div>
                      </td>
                      <td className={tableCellClassName}>
                        {formatTimestamp(item.createdAt)}
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
