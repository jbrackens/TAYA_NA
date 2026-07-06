"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "../../../lib/admin-fetch";
import { usePermissions } from "../../../lib/permissions";
import {
  Badge,
  Button,
  Card,
  DataTable,
  ErrorBoundary,
  ErrorState,
  Input,
  LoadingSpinner,
  type ColumnDef,
} from "../../../components/shared";

interface PendingReview extends Record<string, unknown> {
  userId: string;
  status: string;
  riskLevel: string;
  documentCount: number;
  submittedAt: string;
}

interface KYCStatus {
  userId: string;
  status: string;
  riskLevel?: string;
  rejectionReason?: string;
  lastVerifiedAt?: string;
}

interface KYCDocument {
  id: string;
  userId: string;
  type: string;
  documentId?: string;
  issuingCountry?: string;
  expiryDate?: string;
  status: string;
  rejectReason?: string;
  submittedAt: string;
  verifiedAt?: string;
}

// P0-4: structured identity + sanctions-screening verdict (reviewer-visible
// only — the subject never sees it).
interface KYCIdentity {
  userId: string;
  fullName: string;
  dateOfBirth?: string;
  country?: string;
  screeningStatus: string;
  screeningScore: number;
  screeningMatchIds?: string[];
  screeningProvider?: string;
  screenedAt?: string;
}

const statusBadgeVariant = (
  status: string,
): "default" | "success" | "warning" | "danger" => {
  switch (status) {
    case "approved":
      return "success";
    case "pending":
    case "verifying":
    case "submitted":
      return "warning";
    case "declined":
    case "rejected":
    case "blocked":
      return "danger";
    default:
      return "default";
  }
};

const screeningBadgeVariant = (
  status: string,
): "default" | "success" | "warning" | "danger" => {
  switch (status) {
    case "clear":
    case "cleared_by_review":
      return "success";
    case "hit":
    case "hit_confirmed":
      return "danger";
    default:
      // potential_match / unavailable / unscreened / unknown all need review.
      return "warning";
  }
};

function KYCReviewPageContent() {
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailStatus, setDetailStatus] = useState<KYCStatus | null>(null);
  const [detailDocs, setDetailDocs] = useState<KYCDocument[]>([]);
  const [detailIdentity, setDetailIdentity] = useState<KYCIdentity | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [reason, setReason] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(false);
  // GAP-84 (§29): KYC decisions + screening reviews are compliance:write
  // server-side; disable them for a read-only caller.
  const { can } = usePermissions();
  const canWrite = can("compliance:write");
  const [decisionNotice, setDecisionNotice] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/v1/admin/kyc/queue?limit=100");
      if (!res.ok) {
        throw new Error(`queue request failed (${res.status})`);
      }
      const payload = (await res.json()) as { reviews: PendingReview[] };
      setReviews(payload.reviews ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (userId: string) => {
    setSelectedUserId(userId);
    setDetailLoading(true);
    setDetailError(null);
    setDecisionNotice(null);
    setReason("");
    try {
      const res = await adminFetch(
        `/api/v1/admin/kyc/users/${encodeURIComponent(userId)}`,
      );
      if (!res.ok) {
        throw new Error(`detail request failed (${res.status})`);
      }
      const payload = (await res.json()) as {
        status: KYCStatus;
        documents: KYCDocument[];
        identity: KYCIdentity | null;
      };
      setDetailStatus(payload.status);
      setDetailDocs(payload.documents ?? []);
      setDetailIdentity(payload.identity ?? null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setDetailError(message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const submitDecision = useCallback(
    async (approve: boolean) => {
      if (!selectedUserId) return;
      if (!approve && reason.trim() === "") {
        setDecisionNotice("A reason is required to decline.");
        return;
      }
      setDecisionBusy(true);
      setDecisionNotice(null);
      try {
        const res = await adminFetch("/api/v1/admin/kyc/decision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUserId,
            approve,
            reason: reason.trim(),
          }),
        });
        const payload = (await res.json()) as {
          status?: string;
          error?: { message?: string };
        };
        if (!res.ok) {
          throw new Error(
            payload.error?.message ?? `decision failed (${res.status})`,
          );
        }
        setDecisionNotice(
          approve ? "Identity approved." : "Identity declined.",
        );
        await Promise.all([loadQueue(), loadDetail(selectedUserId)]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setDecisionNotice(message);
      } finally {
        setDecisionBusy(false);
      }
    },
    [selectedUserId, reason, loadQueue, loadDetail],
  );

  // GAP-103 (§12 "decline/request-documents" / Scenario 4): the non-terminal
  // review outcome — ask the player for more documents (status
  // documents_required) instead of a terminal approve/decline. compliance:write
  // server-side, audited kyc.documents_requested. Requires the shared reason.
  const requestDocuments = useCallback(async () => {
    if (!selectedUserId) return;
    if (reason.trim() === "") {
      setDecisionNotice("A reason is required to request documents.");
      return;
    }
    setDecisionBusy(true);
    setDecisionNotice(null);
    try {
      const res = await adminFetch("/api/v1/admin/kyc/request-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, reason: reason.trim() }),
      });
      const payload = (await res.json()) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(
          payload.error?.message ?? `request failed (${res.status})`,
        );
      }
      setDecisionNotice("Additional documents requested from the player.");
      await Promise.all([loadQueue(), loadDetail(selectedUserId)]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setDecisionNotice(message);
    } finally {
      setDecisionBusy(false);
    }
  }, [selectedUserId, reason, loadQueue, loadDetail]);

  // P0-4: a reviewer resolves the screening verdict — cleared (false
  // positive; approval becomes possible) or confirmed (real hit; approval
  // stays blocked). Requires the shared reason field.
  const submitScreeningReview = useCallback(
    async (outcome: "cleared" | "confirmed") => {
      if (!selectedUserId) return;
      if (reason.trim() === "") {
        setDecisionNotice("A reason is required to resolve screening.");
        return;
      }
      setDecisionBusy(true);
      setDecisionNotice(null);
      try {
        const res = await adminFetch("/api/v1/admin/kyc/screening-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUserId,
            outcome,
            reason: reason.trim(),
          }),
        });
        const payload = (await res.json()) as {
          identity?: KYCIdentity;
          error?: { message?: string };
        };
        if (!res.ok) {
          throw new Error(
            payload.error?.message ?? `screening review failed (${res.status})`,
          );
        }
        setDecisionNotice(
          outcome === "cleared"
            ? "Screening cleared as false positive."
            : "Screening hit confirmed — approval stays blocked.",
        );
        await loadDetail(selectedUserId);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setDecisionNotice(message);
      } finally {
        setDecisionBusy(false);
      }
    },
    [selectedUserId, reason, loadDetail],
  );

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const columns: ColumnDef<PendingReview>[] = [
    { key: "userId", label: "User" },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge variant={statusBadgeVariant(String(value))}>
          {String(value)}
        </Badge>
      ),
    },
    { key: "riskLevel", label: "Risk" },
    { key: "documentCount", label: "Documents" },
    { key: "submittedAt", label: "First submitted" },
  ];

  if (error) {
    return <ErrorState message={error} onRetry={loadQueue} />;
  }

  return (
    <div className="space-y-6" data-testid="kyc-review-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Inter',sans-serif] text-2xl font-semibold text-[var(--t1,#1a1a1a)]">
            KYC Review
          </h1>
          <p className="mt-1 text-sm text-[var(--t2,#4a4a4a)]">
            Pending identity verifications, oldest first. Approving marks the
            user verified for guarded account checks.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={loadQueue}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div data-testid="kyc-queue-table">
          <DataTable
            columns={columns}
            data={reviews}
            onRowClick={(row) => void loadDetail(row.userId)}
            emptyMessage="No identities awaiting review"
          />
        </div>
      )}

      {selectedUserId && (
        <Card data-testid="kyc-detail-panel">
          <div className="flex items-center justify-between">
            <h2 className="font-['Inter',sans-serif] text-lg font-semibold text-[var(--t1,#1a1a1a)]">
              Review: {selectedUserId}
            </h2>
            {detailStatus && (
              <Badge variant={statusBadgeVariant(detailStatus.status)}>
                {detailStatus.status}
              </Badge>
            )}
          </div>

          {detailLoading && <LoadingSpinner />}
          {detailError && (
            <ErrorState
              message={detailError}
              onRetry={() => void loadDetail(selectedUserId)}
            />
          )}

          {!detailLoading && !detailError && (
            <>
              <div className="mt-4 space-y-2" data-testid="kyc-documents">
                {detailDocs.length === 0 && (
                  <p className="text-sm text-[var(--t2,#4a4a4a)]">
                    No documents submitted.
                  </p>
                )}
                {detailDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-1,#e5dfd2)] px-4 py-3"
                    data-testid="kyc-document-row"
                  >
                    <div>
                      <span className="text-sm font-medium text-[var(--t1,#1a1a1a)]">
                        {doc.type}
                      </span>
                      <span className="ml-3 text-xs text-[var(--t3,#8b8378)]">
                        {doc.issuingCountry || "—"} · submitted{" "}
                        {doc.submittedAt}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={statusBadgeVariant(doc.status)}>
                        {doc.status}
                      </Badge>
                      <a
                        className="text-sm font-medium text-[var(--accent-strong,#0e7a53)] underline-offset-2 hover:underline"
                        href={`/api/v1/admin/kyc/documents/${encodeURIComponent(doc.id)}/content`}
                        target="_blank"
                        rel="noreferrer"
                        data-testid="kyc-document-view-link"
                      >
                        View document
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="mt-4 rounded-lg border border-[var(--border-1,#e5dfd2)] px-4 py-3"
                data-testid="kyc-identity-panel"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--t1,#1a1a1a)]">
                    Identity &amp; sanctions screening
                  </span>
                  {detailIdentity ? (
                    <Badge
                      variant={screeningBadgeVariant(
                        detailIdentity.screeningStatus,
                      )}
                    >
                      {detailIdentity.screeningStatus}
                    </Badge>
                  ) : (
                    <Badge variant="warning">no identity submitted</Badge>
                  )}
                </div>
                {detailIdentity ? (
                  <>
                    <p className="text-sm text-[var(--t2,#4a4a4a)]">
                      {detailIdentity.fullName}
                      {detailIdentity.dateOfBirth
                        ? ` · born ${detailIdentity.dateOfBirth}`
                        : ""}
                      {detailIdentity.country
                        ? ` · ${detailIdentity.country}`
                        : ""}
                      {detailIdentity.screeningProvider
                        ? ` · screened via ${detailIdentity.screeningProvider}`
                        : ""}
                      {detailIdentity.screeningScore > 0
                        ? ` · best match ${(detailIdentity.screeningScore * 100).toFixed(0)}%`
                        : ""}
                    </p>
                    {(detailIdentity.screeningMatchIds?.length ?? 0) > 0 && (
                      <p className="mt-1 text-xs text-[var(--t3,#8b8378)]">
                        Candidate entities:{" "}
                        {detailIdentity.screeningMatchIds?.join(", ")}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void submitScreeningReview("cleared")}
                        disabled={decisionBusy || !canWrite}
                        data-testid="kyc-screening-clear-button"
                      >
                        Clear as false positive
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => void submitScreeningReview("confirmed")}
                        disabled={decisionBusy || !canWrite}
                        data-testid="kyc-screening-confirm-button"
                      >
                        Confirm hit
                      </Button>
                      <span className="text-xs text-[var(--t3,#8b8378)]">
                        Approval requires a clear or reviewer-cleared screening.
                        Uses the reason field below.
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[var(--t2,#4a4a4a)]">
                    The subject has not submitted structured identity yet —
                    approval is blocked until identity is captured and screened.
                  </p>
                )}
              </div>

              <div className="mt-5 border-t border-[var(--border-1,#e5dfd2)] pt-4">
                <label
                  className="mb-1 block text-sm font-medium text-[var(--t2,#4a4a4a)]"
                  htmlFor="kyc-decision-reason"
                >
                  Reason (required to decline, request documents, or resolve
                  screening)
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    id="kyc-decision-reason"
                    className="flex-1"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. document expired, name mismatch"
                    data-testid="kyc-decision-reason"
                  />
                  <Button
                    variant="primary"
                    onClick={() => void submitDecision(true)}
                    disabled={decisionBusy || !canWrite}
                    data-testid="kyc-approve-button"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void requestDocuments()}
                    disabled={decisionBusy || !canWrite}
                    data-testid="kyc-request-documents-button"
                  >
                    Request documents
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => void submitDecision(false)}
                    disabled={decisionBusy || !canWrite}
                    data-testid="kyc-decline-button"
                  >
                    Decline
                  </Button>
                </div>
                {decisionNotice && (
                  <p
                    className="mt-2 text-sm text-[var(--t2,#4a4a4a)]"
                    data-testid="kyc-decision-notice"
                  >
                    {decisionNotice}
                  </p>
                )}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

export default function KYCReviewPage() {
  return (
    <ErrorBoundary>
      <KYCReviewPageContent />
    </ErrorBoundary>
  );
}
