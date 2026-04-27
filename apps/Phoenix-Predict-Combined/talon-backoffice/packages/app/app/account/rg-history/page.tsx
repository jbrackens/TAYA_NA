"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/ToastProvider";
import { getLimitsHistory } from "../../lib/api/compliance-client";
import type { LimitHistoryItem } from "../../lib/api/compliance-client";

interface GroupedHistory {
  limits: LimitHistoryItem[];
  coolOffs: LimitHistoryItem[];
  exclusions: LimitHistoryItem[];
}

export default function RGHistoryPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [grouped, setGrouped] = useState<GroupedHistory>({
    limits: [],
    coolOffs: [],
    exclusions: [],
  });

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const history = await getLimitsHistory(user.id);
        const grouped: GroupedHistory = {
          limits: history.history.filter(
            (h) =>
              h.limitType.includes("deposit") ||
              h.limitType.includes("stake") ||
              h.limitType.includes("session"),
          ),
          coolOffs: history.history.filter((h) => h.limitType === "cool_off"),
          exclusions: history.history.filter(
            (h) => h.limitType === "self_exclusion",
          ),
        };
        setGrouped(grouped);
      } catch (err: unknown) {
        toast.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, toast]);

  const HistoryTable = ({
    title,
    items,
  }: {
    title: string;
    items: LimitHistoryItem[];
  }) => (
    <div className="rg-section">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <div className="rg-empty">No {title.toLowerCase()} found</div>
      ) : (
        <div className="rg-table-container">
          <table className="rg-table">
            <thead>
              <tr>
                <th>Limit Type</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Effective Date</th>
                <th>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <span className="rg-type">
                      {item.limitType === "deposit_limit"
                        ? "Deposit Limit"
                        : item.limitType === "stake_limit"
                          ? "Stake Limit"
                          : item.limitType === "session_limit"
                            ? "Session Limit"
                            : item.limitType === "cool_off"
                              ? "Cool-off"
                              : item.limitType === "self_exclusion"
                                ? "Self-Exclusion"
                                : item.limitType}
                    </span>
                  </td>
                  <td>
                    {item.oldValue !== null && item.oldValue !== undefined
                      ? typeof item.oldValue === "boolean"
                        ? item.oldValue
                          ? "Enabled"
                          : "Disabled"
                        : `$${item.oldValue}`
                      : "—"}
                  </td>
                  <td>
                    {item.newValue !== null && item.newValue !== undefined
                      ? typeof item.newValue === "boolean"
                        ? item.newValue
                          ? "Enabled"
                          : "Disabled"
                        : `$${item.newValue}`
                      : "—"}
                  </td>
                  <td>{new Date(item.effectiveDate).toLocaleDateString()}</td>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: rgHistoryStyles }} />
      <div className="rg-history-page">
        <div className="rg-header">
          <div>
            <h1>Responsible Gaming History</h1>
            <p>Track all your responsible gaming limits and actions</p>
          </div>
          <Link href="/account" className="rg-back">
            ← Back
          </Link>
        </div>

        {loading ? (
          <div className="rg-loading">Loading history...</div>
        ) : (
          <>
            <HistoryTable title="Limits Changes" items={grouped.limits} />
            <HistoryTable title="Cool-offs" items={grouped.coolOffs} />
            <HistoryTable title="Self-Exclusions" items={grouped.exclusions} />

            {grouped.limits.length === 0 &&
              grouped.coolOffs.length === 0 &&
              grouped.exclusions.length === 0 && (
                <div className="rg-no-history">
                  <div className="rg-no-history-icon">📊</div>
                  <div className="rg-no-history-title">No History Yet</div>
                  <div className="rg-no-history-desc">
                    You haven't set any responsible gaming limits yet. Visit the
                    responsible gaming page to get started.
                  </div>
                  <Link href="/responsible-gaming" className="rg-link-btn">
                    Go to Responsible Gaming
                  </Link>
                </div>
              )}
          </>
        )}
      </div>
    </>
  );
}

const rgHistoryStyles = `
  .rg-history-page { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }

  .rg-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 32px;
  }
  @media (max-width: 640px) {
    .rg-header { flex-direction: column; gap: 16px; }
  }

  .rg-header h1 { font-size: 28px; font-weight: 800; color: var(--t1); margin-bottom: 4px; }
  .rg-header p { font-size: 14px; color: var(--t3); }

  .rg-back {
    padding: 10px 16px; background: var(--surface-1); border: 1px solid var(--border-1);
    border-radius: var(--r-rh-md); color: var(--t1); text-decoration: none; font-size: 13px;
    font-weight: 600; transition: all 0.15s;
  }
  .rg-back:hover { border-color: var(--accent); color: var(--accent); }

  .rg-loading {
    padding: 40px; text-align: center; color: var(--t3); font-size: 14px;
  }

  .rg-section {
    background: var(--surface-1); border: 1px solid var(--border-1); border-radius: var(--r-rh-lg);
    padding: 24px; margin-bottom: 24px;
  }

  .rg-section h2 {
    font-size: 16px; font-weight: 700; color: var(--t1); margin-bottom: 16px;
  }

  .rg-empty {
    padding: 32px; text-align: center; color: var(--t3); font-size: 14px;
    background: var(--surface-2); border-radius: var(--r-rh-md);
  }

  .rg-table-container {
    overflow-x: auto;
  }

  .rg-table {
    width: 100%; border-collapse: collapse;
  }

  .rg-table thead {
    background: var(--surface-2); border-bottom: 1px solid var(--border-1);
  }

  .rg-table th {
    padding: 12px 16px; text-align: left; font-size: 12px;
    font-weight: 700; color: var(--t3); text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .rg-table td {
    padding: 12px 16px; border-bottom: 1px solid var(--border-1);
    font-size: 13px; color: var(--t1);
  }

  .rg-table tbody tr:hover {
    background: var(--surface-2);
  }

  .rg-type {
    display: inline-block; padding: 4px 8px; background: var(--accent-soft);
    border-radius: var(--r-rh-sm); color: var(--accent); font-weight: 600; font-size: 12px;
  }

  .rg-no-history {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 60px 24px; text-align: center;
    background: var(--surface-1); border: 1px solid var(--border-1); border-radius: var(--r-rh-lg);
  }

  .rg-no-history-icon { font-size: 48px; margin-bottom: 16px; }

  .rg-no-history-title {
    font-size: 18px; font-weight: 700; color: var(--t1); margin-bottom: 8px;
  }

  .rg-no-history-desc {
    font-size: 13px; color: var(--t3); max-width: 400px; margin-bottom: 20px;
    line-height: 1.5;
  }

  .rg-link-btn {
    display: inline-block; padding: 10px 20px; background: var(--accent);
    border: none; border-radius: var(--r-rh-md); color: #fff; text-decoration: none;
    font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s;
  }

  .rg-link-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
`;
