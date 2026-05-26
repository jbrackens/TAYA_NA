"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/ToastProvider";
import { getTransactions } from "../../lib/api/wallet-client";
import { GetTransactionsPaginatedResponse } from "../../lib/api/wallet-client";
import { logger } from "../../lib/logger";

type DateRange = "all" | "24h" | "week" | "month" | "3m" | "6m" | "year";
type TxType = "all" | "deposit" | "withdrawal";

const pageClass = "mx-auto max-w-[1200px] px-4 py-6";
const headerClass =
  "mb-8 flex items-start justify-between max-[640px]:flex-col max-[640px]:gap-4";
const backClass =
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

export default function TransactionsPage() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [txType, setTxType] = useState<TxType>("all");
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
      const allData = await getTransactions(user.id, {
        limit: 1000,
        transaction_type: txType === "all" ? undefined : txType,
      });
      const txns = allData.transactions || [];
      const header = "Date,Type,Amount,Balance After,Transaction ID";
      const rows = txns.map((tx) =>
        [
          new Date(tx.createdAt).toISOString(),
          tx.type,
          tx.amount.toFixed(2),
          tx.balanceAfter?.toFixed(2) || "",
          tx.transactionId,
        ].join(","),
      );
      const csvContent = [header, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hula_na_transactions_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      logger.info("Transactions", "CSV export completed", {
        count: txns.length,
      });
      success("Export complete", `${txns.length} transactions exported`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Transactions", "CSV export failed", message);
      showError("Export failed", message);
    } finally {
      setExporting(false);
    }
  };

  // Fetch transactions
  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        // Note: Date filtering would be done client-side if needed
        const result = await getTransactions(user.id, {
          page,
          limit: 10,
          transaction_type: txType === "all" ? undefined : txType,
        });
        setResponse(result);
        setLoadError(null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load transactions";
        logger.error("Transactions", "Failed to load transactions", message);
        setLoadError(message);
        setResponse(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, txType, page]);

  const transactions = response?.transactions || [];
  const totalPages = response?.totalPages || 1;

  return (
    <div className={pageClass}>
      <div className={headerClass}>
        <div>
          <h1 className="mb-1 text-[28px] font-extrabold text-[var(--t1)]">
            Transaction History
          </h1>
          <p className="text-sm text-[var(--t3)]">
            View all your deposits and withdrawals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={backClass}
            onClick={handleExportCSV}
            disabled={exporting}
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <Link href="/account" className={backClass}>
            ← Back to Account
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.05em] text-[var(--t3)]">
            Date Range
          </label>
          <div className="flex flex-wrap gap-2">
            {(["all", "24h", "week", "month", "3m", "6m", "year"] as const).map(
              (r) => (
                <button
                  key={r}
                  className={filterButtonClass(dateRange === r)}
                  onClick={() => {
                    setDateRange(r);
                    setPage(1);
                  }}
                >
                  {r === "all"
                    ? "All Time"
                    : r === "24h"
                      ? "Last 24h"
                      : r === "week"
                        ? "Last Week"
                        : r === "month"
                          ? "Last Month"
                          : r === "3m"
                            ? "Last 3 Months"
                            : r === "6m"
                              ? "Last 6 Months"
                              : "Last Year"}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.05em] text-[var(--t3)]">
            Type
          </label>
          <div className="flex flex-wrap gap-2">
            {(["all", "deposit", "withdrawal"] as const).map((t) => (
              <button
                key={t}
                className={filterButtonClass(txType === t)}
                onClick={() => {
                  setTxType(t);
                  setPage(1);
                }}
              >
                {t === "all" ? "All" : t === "deposit" ? "Deposit" : "Withdrawal"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)]">
        {loading ? (
          <div className="p-10 text-center text-sm text-[var(--t3)]">
            Loading transactions...
          </div>
        ) : loadError ? (
          <div className="p-10 text-center text-sm text-[var(--t3)]">
            Transaction history is temporarily unavailable.
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--t3)]">
            No transactions found for this period.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="border-b border-[var(--border-1)] bg-[var(--surface-2)]">
                  <tr>
                    <th className={tableHeadCellClass}>Date</th>
                    <th className={tableHeadCellClass}>Type</th>
                    <th className={tableHeadCellClass}>Amount</th>
                    <th className={tableHeadCellClass}>Balance After</th>
                    <th className={tableHeadCellClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.transactionId}
                      className="hover:bg-[var(--surface-2)]"
                    >
                      <td className={tableCellClass}>
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className={tableCellClass}>
                        <span className="inline-block rounded-[var(--r-rh-sm)] bg-[var(--accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--accent)]">
                          {tx.type === "deposit"
                            ? "Deposit"
                            : tx.type === "withdrawal"
                              ? "Withdrawal"
                              : tx.type}
                        </span>
                      </td>
                      <td className={tableCellClass}>
                        <span
                          className={
                            tx.type === "deposit"
                              ? "font-bold text-[var(--accent)]"
                              : "font-bold text-[var(--no-text)]"
                          }
                        >
                          {tx.type === "deposit" ? "+" : "-"}$
                          {Math.abs(tx.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className={tableCellClass}>
                        ${tx.balanceAfter?.toFixed(2) || "—"}
                      </td>
                      <td className={tableCellClass}>
                        <span className="inline-block rounded-[var(--r-rh-sm)] bg-[var(--surface-2)] px-2 py-1 text-xs font-semibold text-[var(--t2)]">
                          {tx.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 border-t border-[var(--border-1)] p-4">
                <button
                  className="cursor-pointer rounded-[var(--r-rh-sm)] border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--t2)] transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Prev
                </button>
                <div className="text-[13px] font-semibold text-[var(--t2)]">
                  Page {page} of {totalPages}
                </div>
                <button
                  className="cursor-pointer rounded-[var(--r-rh-sm)] border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--t2)] transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
