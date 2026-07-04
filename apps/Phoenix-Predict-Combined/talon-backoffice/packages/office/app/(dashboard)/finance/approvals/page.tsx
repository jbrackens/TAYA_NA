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
  LoadingSpinner,
  type ColumnDef,
} from "../../../components/shared";

// Dual-approval (maker-checker) queue for high-value manual adjustments
// (PAM §7 Permission Model + §25 Admin Operations and Configuration). The
// maker who proposed an adjustment cannot approve it — the gateway enforces
// maker != checker and surfaces a 403 here.

interface PendingAction extends Record<string, unknown> {
  id: number;
  subjectId: string;
  direction: string;
  amountCents: number;
  reason: string;
  makerId: string;
  status: string;
  createdAt: string;
}

function FinanceApprovalsContent() {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // GAP-84 (§29): maker-checker approvals are finances:write server-side; disable
  // for a read-only caller. (The backend also enforces maker≠checker.)
  const { can } = usePermissions();
  const canWrite = can("finances:write");
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(
        "/api/v1/admin/finance/adjustments/pending?status=pending&limit=200",
      );
      if (!res.ok) throw new Error(`request failed (${res.status})`);
      const data = (await res.json()) as { actions: PendingAction[] };
      setActions(data.actions ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = useCallback(
    async (id: number, decision: "approve" | "reject") => {
      let body: string | undefined;
      if (decision === "reject") {
        const reason = window.prompt("Reason for rejecting (required):") || "";
        if (reason.trim() === "") {
          setNotice("A reason is required to reject.");
          return;
        }
        body = JSON.stringify({ reason: reason.trim() });
      }
      setBusy(true);
      setNotice(null);
      try {
        const res = await adminFetch(
          `/api/v1/admin/finance/adjustments/pending/${id}/${decision}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          },
        );
        const payload = (await res.json()) as { error?: { message?: string } };
        if (!res.ok) {
          throw new Error(
            payload.error?.message ?? `${decision} failed (${res.status})`,
          );
        }
        setNotice(
          decision === "approve" ? "Approved and executed." : "Rejected.",
        );
        await load();
      } catch (err: unknown) {
        setNotice(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const columns: ColumnDef<PendingAction>[] = [
    { key: "id", label: "ID" },
    { key: "subjectId", label: "Subject" },
    {
      key: "direction",
      label: "Direction",
      render: (v) => (
        <Badge variant={String(v) === "debit" ? "danger" : "success"}>
          {String(v)}
        </Badge>
      ),
    },
    {
      key: "amountCents",
      label: "Amount (pts)",
      render: (v) =>
        (Number(v) / 100).toLocaleString(undefined, {
          minimumFractionDigits: 2,
        }),
    },
    { key: "reason", label: "Reason" },
    { key: "makerId", label: "Proposed by" },
    { key: "createdAt", label: "Proposed at" },
    {
      key: "id",
      id: "decide",
      label: "Decision",
      render: (_v, row) => (
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            disabled={busy || !canWrite}
            onClick={() => void decide(row.id, "approve")}
            data-testid={`approve-${row.id}`}
          >
            Approve &amp; execute
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={busy || !canWrite}
            onClick={() => void decide(row.id, "reject")}
            data-testid={`reject-${row.id}`}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6" data-testid="finance-approvals-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Inter',sans-serif] text-2xl font-semibold text-[var(--t1,#1a1a1a)]">
            Finance Approvals
          </h1>
          <p className="mt-1 text-sm text-[var(--t2,#4a4a4a)]">
            High-value manual adjustments awaiting a second approver. You cannot
            approve an adjustment you proposed (four-eyes).
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load} disabled={busy}>
          Refresh
        </Button>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {notice && (
        <p
          className="text-sm text-[var(--t2,#4a4a4a)]"
          data-testid="finance-approvals-notice"
        >
          {notice}
        </p>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <Card className="p-5" data-testid="finance-approvals-table">
          <DataTable
            columns={columns}
            data={actions}
            emptyMessage="No adjustments awaiting approval"
          />
        </Card>
      )}
    </div>
  );
}

export default function FinanceApprovalsPage() {
  return (
    <ErrorBoundary>
      <FinanceApprovalsContent />
    </ErrorBoundary>
  );
}
