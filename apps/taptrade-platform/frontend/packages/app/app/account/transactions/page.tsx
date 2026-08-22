"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/ToastProvider";
import {
  getTransactions,
  type GetTransactionsPaginatedResponse,
} from "../../lib/api/wallet-client";
import {
  formatPointDelta,
  isPositivePointMovement,
  pointLedgerDetailLabel,
  pointLedgerTypeLabel,
} from "../../lib/point-ledger";
import { formatPoints } from "../../lib/points";
import { logger } from "../../lib/logger";

type DateRange = "all" | "24h" | "week" | "month" | "3m" | "6m" | "year";

const pageClass = "mx-auto max-w-[1200px] px-4 py-6";
const headerClass =
  "mb-8 flex items-start justify-between max-[640px]:flex-col max-[640px]:gap-4";
const actionClass =
  "rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-2.5 text-[13px] font-semibold text-[var(--t1)] no-underline transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50";
const filterButtonBase =
  "cursor-pointer rounded-[var(--r-rh-sm)] border px-3 py-2 text-xs font-semibold transition-all duration-150";
const tableHeadCellClass =
  "px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.05em] text-[var(--t3)]";
const tableCellClass =
  "border-b border-[var(--border-1)] px-4 py-3 text-[13px] text-[var(--t1)]";

function filterButtonClass(active: boolean) {
  return `${filterButtonBase} ${
    active
      ? "border-[var(--accent)] bg-[var(--surface-1)] text-[var(--accent)]"
      : "border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--t2)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
  }`;
}

// Bounded ledger window: the page fetches the most recent LEDGER_WINDOW
// entries ONCE per user and paginates/filters client-side over that window
// (wallet-client's getTransactions slices within whatever it fetched, so a
// per-page `limit: 10` request could never reach page 2 anyway). The gateway
// ledger endpoint clamps `limit` at EXPORT_WINDOW (500) — CSV export asks for
// that maximum; the on-screen table keeps a lighter 200. When a window comes
// back full, the UI says so instead of implying the full history is shown.
const LEDGER_WINDOW = 200;
const EXPORT_WINDOW = 500;
const PAGE_SIZE = 10;

function cutoffFor(range: DateRange): number {
  const now = Date.now();
  switch (range) {
    case "24h":
      return now - 24 * 60 * 60 * 1000;
    case "week":
      return now - 7 * 24 * 60 * 60 * 1000;
    case "month":
      return now - 30 * 24 * 60 * 60 * 1000;
    case "3m":
      return now - 90 * 24 * 60 * 60 * 1000;
    case "6m":
      return now - 180 * 24 * 60 * 60 * 1000;
    case "year":
      return now - 365 * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
}

export default function PointsLedgerPage() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [page, setPage] = useState(1);
  const [response, setResponse] =
    useState<GetTransactionsPaginatedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleExportCSV = async () => {
    if (!user?.id) return;
    setExporting(true);
    try {
      // EXPORT_WINDOW matches the gateway's ledger clamp — asking for more
      // (the old limit: 1000) silently returned 500 anyway.
      const allData = await getTransactions(user.id, { limit: EXPORT_WINDOW });
      const exportTruncated =
        (allData.transactions || []).length >= EXPORT_WINDOW;
      const cutoff = cutoffFor(dateRange);
      const entries = (allData.transactions || []).filter((tx) =>
        cutoff ? new Date(tx.createdAt).getTime() >= cutoff : true,
      );
      const header = "Date,Type,Point Delta,Points After,Ledger ID";
      const rows = entries.map((tx) => {
        return [
          new Date(tx.createdAt).toISOString(),
          pointLedgerTypeLabel(tx),
          formatPointDelta(tx),
          formatPoints(tx.balanceAfter),
          tx.transactionId,
        ].join(",");
      });
      const csvContent = [header, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `taptrade_point_ledger_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      logger.info("PointsLedger", "CSV export completed", {
        count: entries.length,
        truncated: exportTruncated,
      });
      success(
        "Export complete",
        exportTruncated
          ? `${entries.length} ledger entries exported (most recent ${EXPORT_WINDOW})`
          : `${entries.length} ledger entries exported`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("PointsLedger", "CSV export failed", message);
      showError("Export failed", message);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        // One bounded window per user; page changes and date-range filters
        // are applied client-side below, so they cost no further requests.
        const result = await getTransactions(user.id, {
          limit: LEDGER_WINDOW,
        });
        setResponse(result);
        setLoadError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load point ledger";
        logger.error("PointsLedger", "Failed to load point ledger", message);
        setLoadError(message);
        setResponse(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const cutoff = cutoffFor(dateRange);
  const windowEntries = response?.transactions || [];
  const windowTruncated = windowEntries.length >= LEDGER_WINDOW;
  const filtered = windowEntries.filter((tx) =>
    cutoff ? new Date(tx.createdAt).getTime() >= cutoff : true,
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clamp so shrinking the filter while deep in the list can't strand the
  // pager on an empty page.
  const currentPage = Math.min(page, totalPages);
  const transactions = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className={pageClass}>
      <div className={headerClass}>
        <div>
          <h1 className="mb-1 text-[28px] font-extrabold text-[var(--t1)]">
            Point ledger
          </h1>
          <p className="text-sm text-[var(--t3)]">
            Every gameplay point movement recorded for review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={actionClass}
            onClick={handleExportCSV}
            disabled={exporting}
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <Link href="/account" className={actionClass}>
            Back to Account
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <span
          id="tx-date-range-label"
          className="mb-2 block text-xs font-semibold uppercase tracking-[0.05em] text-[var(--t3)]"
        >
          Date range
        </span>
        {/* biome-ignore lint/a11y/useSemanticElements: labeled control group; fieldset/legend swap is queued for the P2 primitives pass (fieldset layout quirks) */}
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-labelledby="tx-date-range-label"
        >
          {(["all", "24h", "week", "month", "3m", "6m", "year"] as const).map(
            (r) => (
              <button
                type="button"
                key={r}
                className={filterButtonClass(dateRange === r)}
                onClick={() => {
                  setDateRange(r);
                  setPage(1);
                }}
              >
                {r === "all"
                  ? "All time"
                  : r === "24h"
                    ? "Last 24h"
                    : r === "week"
                      ? "Last week"
                      : r === "month"
                        ? "Last month"
                        : r === "3m"
                          ? "Last 3 months"
                          : r === "6m"
                            ? "Last 6 months"
                            : "Last year"}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)]">
        {loading ? (
          <div className="p-10 text-center text-sm text-[var(--t3)]">
            Loading point ledger...
          </div>
        ) : loadError ? (
          <div className="p-10 text-center text-sm text-[var(--t3)]">
            Point ledger is temporarily unavailable.
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--t3)]">
            No point movements found for this period.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="border-b border-[var(--border-1)] bg-[var(--surface-2)]">
                  <tr>
                    <th className={tableHeadCellClass}>Date</th>
                    <th className={tableHeadCellClass}>Movement</th>
                    <th className={tableHeadCellClass}>Delta</th>
                    <th className={tableHeadCellClass}>Points after</th>
                    <th className={tableHeadCellClass}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const positive = isPositivePointMovement(tx);
                    return (
                      <tr
                        key={tx.transactionId}
                        className="hover:bg-[var(--surface-2)]"
                      >
                        <td className={tableCellClass}>
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className={tableCellClass}>
                          <span className="inline-block rounded-[var(--r-rh-sm)] bg-[var(--accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--accent)]">
                            {pointLedgerTypeLabel(tx)}
                          </span>
                        </td>
                        <td className={tableCellClass}>
                          <span
                            className={
                              positive
                                ? "font-bold text-[var(--reward-text)]"
                                : "font-bold text-[var(--brand-dark)]"
                            }
                          >
                            {formatPointDelta(tx)}
                          </span>
                        </td>
                        <td className={tableCellClass}>
                          {formatPoints(tx.balanceAfter)}
                        </td>
                        <td className={tableCellClass}>
                          <span className="inline-block max-w-[320px] truncate rounded-[var(--r-rh-sm)] bg-[var(--surface-2)] px-2 py-1 text-xs font-semibold text-[var(--t2)]">
                            {pointLedgerDetailLabel(tx)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {windowTruncated && (
              <div className="border-t border-[var(--border-1)] px-4 py-3 text-center text-xs text-[var(--t3)]">
                Showing your most recent {LEDGER_WINDOW} point movements. Export
                CSV covers up to the most recent {EXPORT_WINDOW}.
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 border-t border-[var(--border-1)] p-4">
                <button
                  type="button"
                  className="cursor-pointer rounded-[var(--r-rh-sm)] border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--t2)] transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setPage(() => Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>
                <div className="text-[13px] font-semibold text-[var(--t2)]">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  type="button"
                  className="cursor-pointer rounded-[var(--r-rh-sm)] border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--t2)] transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() =>
                    setPage(() => Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
