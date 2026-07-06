"use client";

import { useState, useEffect } from "react";
import {
  ConfirmModal,
  ErrorBoundary,
  ErrorState,
} from "../../components/shared";
import { adminFetch } from "../../lib/admin-fetch";

// ADR-0004 #6 — dispute-review queue.
//
// Admins review user-filed disputes against prediction-market resolutions
// and resolve each one of two ways:
//   - "uphold": the dispute is valid → the gateway VOIDS the market and
//     returns locked points. The point disbursement is irreversible, so the UI
//     gates it behind an explicit confirm step (ConfirmModal, danger).
//   - "reject": the dispute is without merit → it is closed, and a later
//     finalize settles the market. Lower-risk, no confirm gate.
//
// All calls go through `adminFetch` (credentials + X-Admin-Role + CSRF on
// mutations) against the same-origin /api/v1/* gateway proxy.

interface Dispute {
  id: string;
  marketId: string;
  userId: string;
  reason: string;
  status: string;
  resolutionNote?: string;
  bondPointsCents: number;
  unit: "PTS";
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface SourceHealth {
  source: string;
  healthy: boolean;
  consecutiveFailures: number;
  totalSuccesses: number;
  totalFailures: number;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastError?: string;
}

type Decision = "uphold" | "reject";

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function isDispute(value: unknown): value is Dispute {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.marketId === "string" &&
    typeof record.userId === "string" &&
    typeof record.reason === "string" &&
    typeof record.bondPointsCents === "number" &&
    record.unit === "PTS"
  );
}

function isSourceHealth(value: unknown): value is SourceHealth {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.source === "string" && typeof record.healthy === "boolean"
  );
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

function sourceChipClassName(healthy: boolean) {
  return `inline-flex items-center gap-1.5 rounded-[999px] border px-3 py-1.5 text-xs font-semibold ${
    healthy
      ? "border-[var(--border-1,#e5dfd2)] bg-[var(--surface-2,#fcfaf5)] text-[var(--t2,#4a4a4a)]"
      : "border-[var(--no,#ff8b6b)] bg-[var(--no-soft,rgba(255,139,107,0.16))] text-[var(--no-text,#a8472d)]"
  }`;
}

function DisputesPageContent() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [sources, setSources] = useState<SourceHealth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Per-row resolution note, keyed by dispute id.
  const [notes, setNotes] = useState<Record<string, string>>({});
  // Id of the dispute currently being resolved (disables its buttons).
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  // Dispute pending an uphold confirmation, or null when the modal is closed.
  const [pendingUphold, setPendingUphold] = useState<Dispute | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDisputes = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await adminFetch("/api/v1/admin/disputes");
        if (!response.ok) {
          throw new Error("Failed to load disputes");
        }
        const data: unknown = await response.json();
        const rawItems =
          typeof data === "object" &&
          data !== null &&
          Array.isArray((data as { items?: unknown }).items)
            ? (data as { items: unknown[] }).items
            : [];
        const items = rawItems.filter(isDispute);

        if (!cancelled) {
          setDisputes(items);
        }

        // Source-health widget is a nice-to-have: a failure here must not
        // break the disputes queue, so it is fetched best-effort.
        try {
          const healthResponse = await adminFetch(
            "/api/v1/admin/resolution-sources",
          );
          if (healthResponse.ok) {
            const healthData: unknown = await healthResponse.json();
            const rawSources =
              typeof healthData === "object" &&
              healthData !== null &&
              Array.isArray((healthData as { items?: unknown }).items)
                ? (healthData as { items: unknown[] }).items
                : [];
            if (!cancelled) {
              setSources(rawSources.filter(isSourceHealth));
            }
          }
        } catch {
          if (!cancelled) {
            setSources([]);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(errorMessage(err, "Failed to load disputes"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadDisputes();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const refetch = () => setReloadKey((value) => value + 1);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setDisputes([]);
    refetch();
  };

  const resolveDispute = async (dispute: Dispute, decision: Decision) => {
    setResolvingId(dispute.id);
    setError(null);
    try {
      const note = notes[dispute.id]?.trim();
      const response = await adminFetch(
        `/api/v1/admin/disputes/${dispute.id}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            ...(note ? { note } : {}),
          }),
        },
      );
      if (!response.ok) {
        throw new Error(
          decision === "uphold"
            ? "Failed to uphold dispute"
            : "Failed to reject dispute",
        );
      }
      // Drop the local note for the resolved row, then refetch the queue.
      setNotes((prev) => {
        const next = { ...prev };
        delete next[dispute.id];
        return next;
      });
      refetch();
    } catch (err: unknown) {
      setError(errorMessage(err, "Failed to resolve dispute"));
    } finally {
      setResolvingId(null);
    }
  };

  const handleConfirmUphold = async () => {
    if (!pendingUphold) return;
    const dispute = pendingUphold;
    setPendingUphold(null);
    await resolveDispute(dispute, "uphold");
  };

  return (
    <div>
      <h1 className={pageTitleClassName}>Disputes</h1>
      <p className="m-0 mb-6 text-sm leading-[1.5] text-[var(--t2,#4a4a4a)]">
        Review user-filed disputes against market resolutions. Upholding a
        dispute voids the market and returns locked points; rejecting closes it
        so the resolution can be finalized.
      </p>

      {sources.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {sources.map((source) => (
            <span
              className={sourceChipClassName(source.healthy)}
              key={source.source}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  source.healthy
                    ? "bg-[var(--accent,#2be480)]"
                    : "bg-[var(--no-text,#a8472d)]"
                }`}
              />
              {source.source}
              {!source.healthy && source.consecutiveFailures > 0
                ? ` · ${source.consecutiveFailures} fails`
                : ""}
            </span>
          ))}
        </div>
      )}

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
          Loading disputes…
        </div>
      )}

      {!error && !isLoading && disputes.length === 0 && (
        <div
          className={`${stateClassName} text-[15px] text-[var(--t3,#8b8378)]`}
        >
          No open disputes
        </div>
      )}

      {!error && !isLoading && disputes.length > 0 && (
        <div className="w-full overflow-x-auto">
          <table className="w-full overflow-hidden rounded-xl border-collapse bg-[var(--surface-1,#ffffff)]">
            <thead>
              <tr>
                <th className={tableHeaderClassName}>Market</th>
                <th className={tableHeaderClassName}>User</th>
                <th className={tableHeaderClassName}>Reason</th>
                <th className={tableHeaderClassName}>Filed</th>
                <th className={tableHeaderClassName}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((dispute) => {
                const isRowBusy = resolvingId === dispute.id;
                return (
                  <tr
                    className="transition-colors duration-200 ease-[ease] hover:bg-[var(--surface-2,#fcfaf5)]"
                    key={dispute.id}
                  >
                    <td className={tableCellClassName}>
                      <span className={monoClassName}>{dispute.marketId}</span>
                    </td>
                    <td className={tableCellClassName}>
                      <span className={monoClassName}>{dispute.userId}</span>
                    </td>
                    <td className={tableCellClassName}>
                      <div className="max-w-[360px] whitespace-pre-wrap break-words text-[var(--t1,#1a1a1a)]">
                        {dispute.reason}
                      </div>
                    </td>
                    <td className={tableCellClassName}>
                      {formatTimestamp(dispute.createdAt)}
                    </td>
                    <td className={tableCellClassName}>
                      <textarea
                        className="mb-2 min-h-14 w-full min-w-[220px] resize-y rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-2,#fcfaf5)] px-2.5 py-2 font-[inherit] text-[13px] text-[var(--t1,#1a1a1a)] placeholder:text-[var(--t3,#8b8378)] focus:border-[var(--focus-ring,#0e7a53)] focus:outline-none"
                        placeholder="Resolution note (optional)"
                        value={notes[dispute.id] ?? ""}
                        disabled={isRowBusy}
                        onChange={(e) =>
                          setNotes((prev) => ({
                            ...prev,
                            [dispute.id]: e.target.value,
                          }))
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={`${buttonBaseClassName} border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] text-[var(--t1,#1a1a1a)] hover:enabled:border-[var(--focus-ring,#0e7a53)] hover:enabled:text-[var(--focus-ring,#0e7a53)]`}
                          type="button"
                          disabled={isRowBusy}
                          onClick={() => resolveDispute(dispute, "reject")}
                        >
                          {isRowBusy ? "Working…" : "Reject"}
                        </button>
                        <button
                          className={`${buttonBaseClassName} border-[var(--no-text,#a8472d)] bg-[var(--no-text,#a8472d)] text-white hover:enabled:border-[#8b3a25] hover:enabled:bg-[#8b3a25]`}
                          type="button"
                          disabled={isRowBusy}
                          onClick={() => setPendingUphold(dispute)}
                        >
                          Uphold (void &amp; return points)
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

      <ConfirmModal
        isOpen={pendingUphold !== null}
        title="Uphold dispute?"
        message={
          pendingUphold
            ? `Upholding this dispute will VOID market ${pendingUphold.marketId} and return locked points. This cannot be undone.`
            : ""
        }
        impactSummary="The market is voided and locked points are returned."
        confirmText="Uphold, void & return points"
        cancelText="Cancel"
        variant="danger"
        isLoading={resolvingId !== null}
        onConfirm={handleConfirmUphold}
        onCancel={() => setPendingUphold(null)}
      />
    </div>
  );
}

export default function DisputesPage() {
  return (
    <ErrorBoundary>
      <DisputesPageContent />
    </ErrorBoundary>
  );
}
