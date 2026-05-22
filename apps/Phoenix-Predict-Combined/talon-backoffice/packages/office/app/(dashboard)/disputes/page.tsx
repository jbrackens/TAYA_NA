"use client";

import styled from "styled-components";
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
//     refunds all stakes. Money-moving and effectively irreversible, so the
//     UI gates it behind an explicit confirm step (ConfirmModal, danger).
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
  bondCents: number;
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

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--t1, #1a1a1a);
`;

const PageSubtitle = styled.p`
  font-size: 14px;
  color: var(--t2, #4a4a4a);
  margin: 0 0 24px 0;
  line-height: 1.5;
`;

const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background-color: var(--surface-1, #ffffff);
  border-radius: 12px;
  overflow: hidden;

  th {
    text-align: left;
    padding: 12px;
    border-bottom: 1px solid var(--border-1, #e5dfd2);
    font-weight: 600;
    font-size: 12px;
    color: var(--t2, #4a4a4a);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background-color: var(--surface-2, #fcfaf5);
  }

  td {
    padding: 12px;
    border-bottom: 1px solid var(--border-1, #e5dfd2);
    font-size: 14px;
    color: var(--t1, #1a1a1a);
    vertical-align: top;
  }

  tbody tr {
    transition: background-color 0.2s ease;

    &:hover {
      background-color: var(--surface-2, #fcfaf5);
    }
  }
`;

const Mono = styled.span`
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  color: var(--t1, #1a1a1a);
`;

const ReasonCell = styled.div`
  max-width: 360px;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--t1, #1a1a1a);
`;

const NoteField = styled.textarea`
  width: 100%;
  min-width: 220px;
  min-height: 56px;
  padding: 8px 10px;
  margin-bottom: 8px;
  background-color: var(--surface-2, #fcfaf5);
  border: 1px solid var(--border-1, #e5dfd2);
  color: var(--t1, #1a1a1a);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;

  &::placeholder {
    color: var(--t3, #8b8378);
  }

  &:focus {
    outline: none;
    border-color: var(--focus-ring, #0e7a53);
  }
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-1, #e5dfd2);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const RejectButton = styled(ActionButton)`
  background-color: var(--surface-1, #ffffff);
  color: var(--t1, #1a1a1a);

  &:hover:not(:disabled) {
    border-color: var(--focus-ring, #0e7a53);
    color: var(--focus-ring, #0e7a53);
  }
`;

const UpholdButton = styled(ActionButton)`
  background-color: var(--no-text, #a8472d);
  color: #ffffff;
  border-color: var(--no-text, #a8472d);

  &:hover:not(:disabled) {
    background-color: #8b3a25;
    border-color: #8b3a25;
  }
`;

const EmptyState = styled.div`
  padding: 48px 24px;
  text-align: center;
  background-color: var(--surface-1, #ffffff);
  border: 1px solid var(--border-1, #e5dfd2);
  border-radius: 12px;
  color: var(--t3, #8b8378);
  font-size: 15px;
`;

const LoadingState = styled.div`
  padding: 48px 24px;
  text-align: center;
  background-color: var(--surface-1, #ffffff);
  border: 1px solid var(--border-1, #e5dfd2);
  border-radius: 12px;
  color: var(--t2, #4a4a4a);
  font-size: 14px;
`;

const SourceHealthBar = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 24px;
`;

const SourceChip = styled.span<{ $healthy: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid
    ${(props) =>
      props.$healthy ? "var(--border-1, #e5dfd2)" : "var(--no, #ff8b6b)"};
  background-color: ${(props) =>
    props.$healthy
      ? "var(--surface-2, #fcfaf5)"
      : "var(--no-soft, rgba(255, 139, 107, 0.16))"};
  color: ${(props) =>
    props.$healthy ? "var(--t2, #4a4a4a)" : "var(--no-text, #a8472d)"};
`;

const HealthDot = styled.span<{ $healthy: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${(props) =>
    props.$healthy ? "var(--accent, #2be480)" : "var(--no-text, #a8472d)"};
`;

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
    typeof record.reason === "string"
  );
}

function isSourceHealth(value: unknown): value is SourceHealth {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.source === "string" && typeof record.healthy === "boolean"
  );
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
      <PageTitle>Disputes</PageTitle>
      <PageSubtitle>
        Review user-filed disputes against market resolutions. Upholding a
        dispute voids the market and refunds all stakes; rejecting closes it so
        the resolution can be finalized.
      </PageSubtitle>

      {sources.length > 0 && (
        <SourceHealthBar>
          {sources.map((source) => (
            <SourceChip key={source.source} $healthy={source.healthy}>
              <HealthDot $healthy={source.healthy} />
              {source.source}
              {!source.healthy && source.consecutiveFailures > 0
                ? ` · ${source.consecutiveFailures} fails`
                : ""}
            </SourceChip>
          ))}
        </SourceHealthBar>
      )}

      {error && (
        <ErrorState
          title="Something went wrong"
          message={error}
          onRetry={handleRetry}
          showRetryButton={true}
        />
      )}

      {!error && isLoading && <LoadingState>Loading disputes…</LoadingState>}

      {!error && !isLoading && disputes.length === 0 && (
        <EmptyState>No open disputes</EmptyState>
      )}

      {!error && !isLoading && disputes.length > 0 && (
        <TableContainer>
          <StyledTable>
            <thead>
              <tr>
                <th>Market</th>
                <th>User</th>
                <th>Reason</th>
                <th>Filed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((dispute) => {
                const isRowBusy = resolvingId === dispute.id;
                return (
                  <tr key={dispute.id}>
                    <td>
                      <Mono>{dispute.marketId}</Mono>
                    </td>
                    <td>
                      <Mono>{dispute.userId}</Mono>
                    </td>
                    <td>
                      <ReasonCell>{dispute.reason}</ReasonCell>
                    </td>
                    <td>{formatTimestamp(dispute.createdAt)}</td>
                    <td>
                      <NoteField
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
                      <ActionGroup>
                        <RejectButton
                          type="button"
                          disabled={isRowBusy}
                          onClick={() => resolveDispute(dispute, "reject")}
                        >
                          {isRowBusy ? "Working…" : "Reject"}
                        </RejectButton>
                        <UpholdButton
                          type="button"
                          disabled={isRowBusy}
                          onClick={() => setPendingUphold(dispute)}
                        >
                          Uphold (void &amp; refund)
                        </UpholdButton>
                      </ActionGroup>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </StyledTable>
        </TableContainer>
      )}

      <ConfirmModal
        isOpen={pendingUphold !== null}
        title="Uphold dispute?"
        message={
          pendingUphold
            ? `Upholding this dispute will VOID market ${pendingUphold.marketId} and refund all stakes. This cannot be undone.`
            : ""
        }
        impactSummary="The market is voided and every stake is refunded."
        confirmText="Uphold, void & refund"
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
