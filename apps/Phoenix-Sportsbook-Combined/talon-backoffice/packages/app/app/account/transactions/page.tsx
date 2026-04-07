"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/ToastProvider";
import { getTransactions } from "../../lib/api/wallet-client";
import {
  Transaction,
  GetTransactionsPaginatedResponse,
} from "../../lib/api/wallet-client";
import { logger } from "../../lib/logger";

type DateRange = "all" | "24h" | "week" | "month" | "3m" | "6m" | "year";
type TxType =
  | "all"
  | "deposit"
  | "withdrawal"
  | "bet_placement"
  | "bet_settlement";

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
      link.download = `taya_na_transactions_${new Date()
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
    <>
      <style dangerouslySetInnerHTML={{ __html: transactionsStyles }} />
      <div className="tx-page">
        <div className="tx-header">
          <div>
            <h1>Transaction History</h1>
            <p>View all your deposits, withdrawals, and bets</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              className="tx-back"
              onClick={handleExportCSV}
              disabled={exporting}
              style={{
                cursor: exporting ? "not-allowed" : "pointer",
                opacity: exporting ? 0.5 : 1,
              }}
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
            <Link href="/account" className="tx-back">
              ← Back to Account
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="tx-filters">
          <div className="tx-filter-group">
            <label className="tx-filter-label">Date Range</label>
            <div className="tx-filter-buttons">
              {(
                ["all", "24h", "week", "month", "3m", "6m", "year"] as const
              ).map((r) => (
                <button
                  key={r}
                  className={`tx-filter-btn ${dateRange === r ? "active" : ""}`}
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
              ))}
            </div>
          </div>

          <div className="tx-filter-group">
            <label className="tx-filter-label">Type</label>
            <div className="tx-filter-buttons">
              {(
                [
                  "all",
                  "deposit",
                  "withdrawal",
                  "bet_placement",
                  "bet_settlement",
                ] as const
              ).map((t) => (
                <button
                  key={t}
                  className={`tx-filter-btn ${txType === t ? "active" : ""}`}
                  onClick={() => {
                    setTxType(t);
                    setPage(1);
                  }}
                >
                  {t === "all"
                    ? "All"
                    : t === "deposit"
                      ? "Deposit"
                      : t === "withdrawal"
                        ? "Withdrawal"
                        : t === "bet_placement"
                          ? "Bet Placement"
                          : "Bet Settlement"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="tx-card">
          {loading ? (
            <div className="tx-loading">Loading transactions...</div>
          ) : loadError ? (
            <div className="tx-empty">
              Transaction history is temporarily unavailable.
            </div>
          ) : transactions.length === 0 ? (
            <div className="tx-empty">
              No transactions found for this period.
            </div>
          ) : (
            <>
              <div className="tx-table-container">
                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Balance After</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.transactionId}>
                        <td>{new Date(tx.createdAt).toLocaleString()}</td>
                        <td>
                          <span className="tx-type">
                            {tx.type === "deposit"
                              ? "Deposit"
                              : tx.type === "withdrawal"
                                ? "Withdrawal"
                                : tx.type === "bet_placement"
                                  ? "Bet Placement"
                                  : tx.type === "bet_settlement"
                                    ? "Bet Settlement"
                                    : tx.type}
                          </span>
                        </td>
                        <td>
                          <span
                            className={
                              tx.type === "deposit" ? "tx-credit" : "tx-debit"
                            }
                          >
                            {tx.type === "deposit" ||
                            tx.type === "bet_settlement"
                              ? "+"
                              : "-"}
                            ${Math.abs(tx.amount).toFixed(2)}
                          </span>
                        </td>
                        <td>${tx.balanceAfter?.toFixed(2) || "—"}</td>
                        <td>
                          <span className="tx-status">{tx.type}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="tx-pagination">
                  <button
                    className="tx-page-btn"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    ← Prev
                  </button>
                  <div className="tx-page-info">
                    Page {page} of {totalPages}
                  </div>
                  <button
                    className="tx-page-btn"
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
    </>
  );
}

const transactionsStyles = `
  .tx-page { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }

  .tx-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 32px;
  }
  @media (max-width: 640px) {
    .tx-header { flex-direction: column; gap: 16px; }
  }

  .tx-header h1 { font-size: 28px; font-weight: 800; color: #e2e8f0; margin-bottom: 4px; }
  .tx-header p { font-size: 14px; color: #64748b; }

  .tx-back {
    padding: 10px 16px; background: #0f1225; border: 1px solid #1a1f3a;
    border-radius: 8px; color: #e2e8f0; text-decoration: none; font-size: 13px;
    font-weight: 600; transition: all 0.15s;
  }
  .tx-back:hover { border-color: #39ff14; color: #39ff14; }

  .tx-filters { margin-bottom: 24px; }
  .tx-filter-group { margin-bottom: 16px; }
  .tx-filter-label { display: block; font-size: 12px; color: #64748b; font-weight: 600;
    margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }

  .tx-filter-buttons {
    display: flex; gap: 8px; flex-wrap: wrap;
  }

  .tx-filter-btn {
    padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;
    background: #0f1225; border: 1px solid #1a1f3a; color: #D3D3D3;
    cursor: pointer; transition: all 0.15s;
  }

  .tx-filter-btn.active, .tx-filter-btn:hover {
    border-color: #39ff14; color: #39ff14;
  }

  .tx-card {
    background: #0f1225; border: 1px solid #1a1f3a; border-radius: 12px;
    overflow: hidden;
  }

  .tx-loading, .tx-empty {
    padding: 40px; text-align: center; color: #64748b; font-size: 14px;
  }

  .tx-table-container {
    overflow-x: auto;
  }

  .tx-table {
    width: 100%; border-collapse: collapse;
  }

  .tx-table thead {
    background: #161a32; border-bottom: 1px solid #1a1f3a;
  }

  .tx-table th {
    padding: 12px 16px; text-align: left; font-size: 12px;
    font-weight: 700; color: #D3D3D3; text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tx-table td {
    padding: 12px 16px; border-bottom: 1px solid #1a1f3a;
    font-size: 13px; color: #e2e8f0;
  }

  .tx-table tbody tr:hover {
    background: #161a32;
  }

  .tx-type {
    display: inline-block; padding: 4px 8px; background: rgba(57,255,20,0.1);
    border-radius: 4px; color: #39ff14; font-weight: 600; font-size: 12px;
  }

  .tx-credit { color: #22c55e; font-weight: 700; }
  .tx-debit { color: #ef4444; font-weight: 700; }

  .tx-status {
    display: inline-block; padding: 4px 8px; background: #1a1f3a;
    border-radius: 4px; color: #D3D3D3; font-size: 12px; font-weight: 600;
  }

  .tx-pagination {
    display: flex; justify-content: center; align-items: center;
    gap: 16px; padding: 16px; border-top: 1px solid #1a1f3a;
  }

  .tx-page-btn {
    padding: 8px 12px; background: #161a32; border: 1px solid #1a1f3a;
    border-radius: 6px; color: #D3D3D3; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.15s;
  }

  .tx-page-btn:hover:not(:disabled) {
    border-color: #39ff14; color: #39ff14;
  }

  .tx-page-btn:disabled {
    opacity: 0.4; cursor: not-allowed;
  }

  .tx-page-info {
    font-size: 13px; color: #D3D3D3; font-weight: 600;
  }
`;
