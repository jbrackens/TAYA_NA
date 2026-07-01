"use client";

import { DownloadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { ErrorBoundary, ErrorState } from "../../components/shared";
import { adminFetch } from "../../lib/admin-fetch";

type ReportStatus = "open" | "reviewed" | "dismissed" | "all";
type ResolveStatus = "reviewed" | "dismissed";

interface SocialReport {
  id: string;
  commentId: string;
  marketId: string;
  commentUserId: string;
  body: string;
  reporterUserId: string;
  reason: string;
  status: "open" | "reviewed" | "dismissed";
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

function isSocialReport(value: unknown): value is SocialReport {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.commentId === "string" &&
    typeof record.marketId === "string" &&
    typeof record.commentUserId === "string" &&
    typeof record.body === "string" &&
    typeof record.reporterUserId === "string" &&
    typeof record.reason === "string" &&
    typeof record.status === "string"
  );
}

function formatTimestamp(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

const pageTitleClassName =
  "mb-2 text-[28px] font-bold text-[var(--t1,#1a1a1a)]";
const tableHeaderClassName =
  "border-b border-[var(--border-1,#e5dfd2)] bg-[var(--surface-2,#fcfaf5)] p-3 text-left text-xs font-semibold uppercase tracking-[0.04em] text-[var(--t2,#4a4a4a)]";
const tableCellClassName =
  "border-b border-[var(--border-1,#e5dfd2)] p-3 align-top text-sm text-[var(--t1,#1a1a1a)]";
const monoClassName =
  "font-['IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace] text-[13px] text-[var(--t1,#1a1a1a)]";
const buttonBaseClassName =
  "cursor-pointer whitespace-nowrap rounded-lg border px-[14px] py-2 text-[13px] font-semibold transition-all duration-200 ease-[ease] disabled:cursor-not-allowed disabled:opacity-60";
const stateClassName =
  "rounded-xl border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] px-6 py-12 text-center";

function statusClassName(status: SocialReport["status"]) {
  if (status === "open") {
    return "border-[var(--no,#ff8b6b)] bg-[var(--no-soft,rgba(255,139,107,0.16))] text-[var(--no-text,#a8472d)]";
  }
  return "border-[var(--border-1,#e5dfd2)] bg-[var(--surface-2,#fcfaf5)] text-[var(--t2,#4a4a4a)]";
}

function SocialModerationPageContent() {
  const [reports, setReports] = useState<SocialReport[]>([]);
  const [status, setStatus] = useState<ReportStatus>("open");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await adminFetch(
          `/api/v1/admin/social/reports?status=${encodeURIComponent(status)}&limit=100`,
        );
        if (!response.ok) {
          throw new Error("Failed to load social reports");
        }
        const data: unknown = await response.json();
        const rawItems =
          typeof data === "object" &&
          data !== null &&
          Array.isArray((data as { items?: unknown }).items)
            ? (data as { items: unknown[] }).items
            : [];
        if (!cancelled) {
          setReports(rawItems.filter(isSocialReport));
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(errorMessage(err, "Failed to load social reports"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadReports();

    return () => {
      cancelled = true;
    };
  }, [reloadKey, status]);

  const refetch = () => setReloadKey((value) => value + 1);

  const handleRetry = () => {
    setReports([]);
    setIsLoading(true);
    setError(null);
    refetch();
  };

  const exportReportsCSV = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const response = await adminFetch(
        `/api/v1/admin/social/reports?status=${encodeURIComponent(status)}&limit=100&format=csv`,
      );
      if (!response.ok) {
        throw new Error(`Failed to export social reports (${response.status})`);
      }
      const csv = await response.text();
      const url = window.URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `social-reports-${status}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(errorMessage(err, "Failed to export social reports"));
    } finally {
      setIsExporting(false);
    }
  };

  const resolveReport = async (
    report: SocialReport,
    nextStatus: ResolveStatus,
  ) => {
    setResolvingId(report.id);
    setError(null);
    try {
      const response = await adminFetch(
        `/api/v1/admin/social/reports/${encodeURIComponent(report.id)}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: nextStatus,
            note: notes[report.id]?.trim() || undefined,
          }),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to resolve social report");
      }
      setNotes((prev) => {
        const next = { ...prev };
        delete next[report.id];
        return next;
      });
      refetch();
    } catch (err: unknown) {
      setError(errorMessage(err, "Failed to resolve social report"));
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={pageTitleClassName}>Social Reports</h1>
          <p className="m-0 text-sm leading-[1.5] text-[var(--t2,#4a4a4a)]">
            Review reported market comments and keep moderation decisions in the
            admin trail.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--t2,#4a4a4a)]">
            Status
            <select
              className="min-w-[150px] rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] px-3 py-2 text-sm font-medium normal-case tracking-normal text-[var(--t1,#1a1a1a)]"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ReportStatus)
              }
            >
              <option value="open">Open</option>
              <option value="reviewed">Reviewed</option>
              <option value="dismissed">Dismissed</option>
              <option value="all">All</option>
            </select>
          </label>
          <button
            className={`${buttonBaseClassName} inline-flex items-center gap-2 border-[var(--focus-ring,#0e7a53)] bg-[var(--focus-ring,#0e7a53)] text-white hover:enabled:border-[#0a6242] hover:enabled:bg-[#0a6242]`}
            type="button"
            disabled={isExporting}
            onClick={exportReportsCSV}
          >
            <DownloadOutlined aria-hidden="true" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {error && (
        <ErrorState
          title="Something went wrong"
          message={error}
          onRetry={handleRetry}
          showRetryButton={true}
        />
      )}

      {!error && isLoading && (
        <div className={`${stateClassName} text-sm text-[var(--t2,#4a4a4a)]`}>
          Loading social reports…
        </div>
      )}

      {!error && !isLoading && reports.length === 0 && (
        <div
          className={`${stateClassName} text-[15px] text-[var(--t3,#8b8378)]`}
        >
          No social reports
        </div>
      )}

      {!error && !isLoading && reports.length > 0 && (
        <div className="w-full overflow-x-auto">
          <table className="w-full overflow-hidden rounded-xl border-collapse bg-[var(--surface-1,#ffffff)]">
            <thead>
              <tr>
                <th className={tableHeaderClassName}>Market</th>
                <th className={tableHeaderClassName}>Comment</th>
                <th className={tableHeaderClassName}>Report</th>
                <th className={tableHeaderClassName}>Status</th>
                <th className={tableHeaderClassName}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const isRowBusy = resolvingId === report.id;
                return (
                  <tr
                    className="transition-colors duration-200 ease-[ease] hover:bg-[var(--surface-2,#fcfaf5)]"
                    key={report.id}
                  >
                    <td className={tableCellClassName}>
                      <span className={monoClassName}>{report.marketId}</span>
                    </td>
                    <td className={tableCellClassName}>
                      <div className="mb-2 max-w-[420px] whitespace-pre-wrap break-words text-[var(--t1,#1a1a1a)]">
                        {report.body}
                      </div>
                      <div className="text-xs text-[var(--t3,#8b8378)]">
                        Comment by{" "}
                        <span className={monoClassName}>
                          {report.commentUserId}
                        </span>
                      </div>
                    </td>
                    <td className={tableCellClassName}>
                      <div className="mb-2 max-w-[320px] whitespace-pre-wrap break-words">
                        {report.reason}
                      </div>
                      <div className="text-xs text-[var(--t3,#8b8378)]">
                        Reported by{" "}
                        <span className={monoClassName}>
                          {report.reporterUserId}
                        </span>
                        {" · "}
                        {formatTimestamp(report.createdAt)}
                      </div>
                    </td>
                    <td className={tableCellClassName}>
                      <span
                        className={`inline-flex rounded-[999px] border px-3 py-1.5 text-xs font-semibold ${statusClassName(report.status)}`}
                      >
                        {report.status}
                      </span>
                      {report.reviewedAt && (
                        <div className="mt-2 text-xs leading-[1.45] text-[var(--t3,#8b8378)]">
                          {formatTimestamp(report.reviewedAt)}
                          {report.reviewedBy ? ` by ${report.reviewedBy}` : ""}
                        </div>
                      )}
                    </td>
                    <td className={tableCellClassName}>
                      <textarea
                        className="mb-2 min-h-14 w-full min-w-[220px] resize-y rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-2,#fcfaf5)] px-2.5 py-2 font-[inherit] text-[13px] text-[var(--t1,#1a1a1a)] placeholder:text-[var(--t3,#8b8378)] focus:border-[var(--focus-ring,#0e7a53)] focus:outline-none"
                        placeholder="Review note (optional)"
                        value={notes[report.id] ?? report.reviewNote ?? ""}
                        disabled={isRowBusy || report.status !== "open"}
                        onChange={(event) =>
                          setNotes((prev) => ({
                            ...prev,
                            [report.id]: event.target.value,
                          }))
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={`${buttonBaseClassName} border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] text-[var(--t1,#1a1a1a)] hover:enabled:border-[var(--focus-ring,#0e7a53)] hover:enabled:text-[var(--focus-ring,#0e7a53)]`}
                          type="button"
                          disabled={isRowBusy || report.status !== "open"}
                          onClick={() => resolveReport(report, "dismissed")}
                        >
                          {isRowBusy ? "Working…" : "Dismiss"}
                        </button>
                        <button
                          className={`${buttonBaseClassName} border-[var(--focus-ring,#0e7a53)] bg-[var(--focus-ring,#0e7a53)] text-white hover:enabled:border-[#0a6242] hover:enabled:bg-[#0a6242]`}
                          type="button"
                          disabled={isRowBusy || report.status !== "open"}
                          onClick={() => resolveReport(report, "reviewed")}
                        >
                          Mark reviewed
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SocialModerationPage() {
  return (
    <ErrorBoundary>
      <SocialModerationPageContent />
    </ErrorBoundary>
  );
}
