"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-fetch";
import { usePermissions } from "../../lib/permissions";
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
} from "../../components/shared";

interface Alert extends Record<string, unknown> {
  id: number;
  kind: string;
  severity: string;
  subjectId: string;
  marketId: string;
  summary: string;
  status: string;
}

interface SurvCase extends Record<string, unknown> {
  id: number;
  title: string;
  status: string;
  priority: string;
  alertCount: number;
  resolution?: string;
  createdAt: string;
}

const sevVariant = (s: string): "default" | "success" | "warning" | "danger" =>
  s === "high" ? "danger" : s === "medium" ? "warning" : "default";

const caseStatusVariant = (
  s: string,
): "default" | "success" | "warning" | "danger" => {
  if (s === "closed_action") return "success";
  if (s === "closed_no_action") return "default";
  if (s === "investigating") return "warning";
  return "danger";
};

function SurveillancePageContent() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [cases, setCases] = useState<SurvCase[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [caseTitle, setCaseTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // GAP-84 (§29): surveillance mutations are surveillance:write server-side;
  // disable the controls for a read-only caller.
  const { can } = usePermissions();
  const canWrite = can("surveillance:write");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aRes, cRes] = await Promise.all([
        adminFetch("/api/v1/admin/surveillance/alerts?status=open&limit=200"),
        adminFetch("/api/v1/admin/surveillance/cases?limit=200"),
      ]);
      if (!aRes.ok) throw new Error(`alerts request failed (${aRes.status})`);
      const aData = (await aRes.json()) as { alerts: Alert[] };
      setAlerts(aData.alerts ?? []);
      if (cRes.ok) {
        const cData = (await cRes.json()) as { cases: SurvCase[] };
        setCases(cData.cases ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runScan = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminFetch("/api/v1/admin/surveillance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookbackHours: 24 }),
      });
      if (!res.ok) throw new Error(`scan failed (${res.status})`);
      setNotice("Scan complete.");
      await load();
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async (id: number) => {
    setBusy(true);
    try {
      const res = await adminFetch(
        `/api/v1/admin/surveillance/alerts/${id}/dismiss`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`dismiss failed (${res.status})`);
      await load();
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const openCase = async () => {
    const alertIds = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    if (alertIds.length === 0 || caseTitle.trim() === "") {
      setNotice("Select at least one alert and enter a case title.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminFetch("/api/v1/admin/surveillance/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: caseTitle.trim(),
          priority: "medium",
          alertIds,
        }),
      });
      const payload = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        throw new Error(
          payload.error?.message ?? `open case failed (${res.status})`,
        );
      }
      setNotice("Case opened.");
      setSelected({});
      setCaseTitle("");
      await load();
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const dispositionCase = async (c: SurvCase, status: string) => {
    const resolution = status.startsWith("closed_")
      ? window.prompt("Resolution note (required to close):") || ""
      : "";
    if (status.startsWith("closed_") && resolution.trim() === "") {
      setNotice("A resolution is required to close a case.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminFetch(`/api/v1/admin/surveillance/cases/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolution: resolution.trim() }),
      });
      const payload = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        throw new Error(
          payload.error?.message ?? `update failed (${res.status})`,
        );
      }
      await load();
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const alertColumns: ColumnDef<Alert>[] = [
    {
      key: "id",
      id: "select",
      label: "",
      render: (_v, row) => (
        <input
          type="checkbox"
          checked={Boolean(selected[row.id])}
          onChange={(e) =>
            setSelected((s) => ({ ...s, [row.id]: e.target.checked }))
          }
          data-testid={`alert-select-${row.id}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: "kind",
      label: "Kind",
      render: (v) => String(v).replace(/_/g, " "),
    },
    {
      key: "severity",
      label: "Severity",
      render: (v) => <Badge variant={sevVariant(String(v))}>{String(v)}</Badge>,
    },
    { key: "subjectId", label: "Subject" },
    { key: "summary", label: "Summary" },
    {
      key: "id",
      id: "action",
      label: "Action",
      render: (_v, row) => (
        <Button
          variant="secondary"
          size="sm"
          disabled={busy || !canWrite}
          onClick={() => void dismiss(row.id)}
          data-testid={`alert-dismiss-${row.id}`}
        >
          Dismiss
        </Button>
      ),
    },
  ];

  const caseColumns: ColumnDef<SurvCase>[] = [
    { key: "id", label: "ID" },
    { key: "title", label: "Title" },
    {
      key: "status",
      label: "Status",
      render: (v) => (
        <Badge variant={caseStatusVariant(String(v))}>
          {String(v).replace(/_/g, " ")}
        </Badge>
      ),
    },
    { key: "alertCount", label: "Alerts" },
    {
      key: "id",
      id: "disposition",
      label: "Disposition",
      render: (_v, row) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || row.status !== "open" || !canWrite}
            onClick={() => void dispositionCase(row, "investigating")}
          >
            Investigate
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={busy || row.status.startsWith("closed_") || !canWrite}
            onClick={() => void dispositionCase(row, "closed_action")}
          >
            Close (action)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || row.status.startsWith("closed_") || !canWrite}
            onClick={() => void dispositionCase(row, "closed_no_action")}
          >
            Close (no action)
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6" data-testid="surveillance-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Inter',sans-serif] text-2xl font-semibold text-[var(--t1,#1a1a1a)]">
            Market-Integrity Surveillance
          </h1>
          <p className="mt-1 text-sm text-[var(--t2,#4a4a4a)]">
            Wash, spoofing, and collusion alerts. Triage open alerts into cases.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={runScan}
          disabled={busy || !canWrite}
        >
          Run scan (24h)
        </Button>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {notice && (
        <p
          className="text-sm text-[var(--t2,#4a4a4a)]"
          data-testid="surveillance-notice"
        >
          {notice}
        </p>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <Card className="p-5" data-testid="surveillance-alerts">
            <h2 className="m-0 mb-3 text-lg font-semibold text-[var(--t1,#1a1a1a)]">
              Open Alerts
            </h2>
            <DataTable
              columns={alertColumns}
              data={alerts}
              emptyMessage="No open alerts"
            />
            <div className="mt-4 flex items-center gap-3 border-t border-[var(--border-1,#e5dfd2)] pt-4">
              <Input
                className="flex-1"
                placeholder="New case title"
                value={caseTitle}
                onChange={(e) => setCaseTitle(e.target.value)}
                data-testid="case-title"
              />
              <Button
                variant="primary"
                disabled={busy || !canWrite}
                onClick={openCase}
                data-testid="open-case"
              >
                Open case from selection
              </Button>
            </div>
          </Card>

          <Card className="p-5" data-testid="surveillance-cases">
            <h2 className="m-0 mb-3 text-lg font-semibold text-[var(--t1,#1a1a1a)]">
              Cases
            </h2>
            <DataTable
              columns={caseColumns}
              data={cases}
              emptyMessage="No cases opened"
            />
          </Card>
        </>
      )}
    </div>
  );
}

export default function SurveillancePage() {
  return (
    <ErrorBoundary>
      <SurveillancePageContent />
    </ErrorBoundary>
  );
}
