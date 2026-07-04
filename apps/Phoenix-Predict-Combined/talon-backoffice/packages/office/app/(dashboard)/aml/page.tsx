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

// Money-flow AML monitoring back office (PAM §12 KYC, AML, Risk, and
// Compliance + §19 Case Management). Reads the aml_* stores via the gateway;
// all mutations are compliance:write and audited server-side.

interface Rule extends Record<string, unknown> {
  id: number;
  name: string;
  kind: string;
  riskPoints: number;
  severity: string;
  enabled: boolean;
}

interface Alert extends Record<string, unknown> {
  id: number;
  ruleName: string;
  severity: string;
  subjectId: string;
  riskPoints: number;
  summary: string;
  status: string;
}

interface AMLCase extends Record<string, unknown> {
  id: number;
  title: string;
  subjectId: string;
  status: string;
  priority: string;
  riskPoints: number;
  alertCount: number;
  sarReference?: string;
  resolution?: string;
  createdAt: string;
}

const sevVariant = (s: string): "default" | "success" | "warning" | "danger" =>
  s === "high" ? "danger" : s === "medium" ? "warning" : "default";

const caseStatusVariant = (
  s: string,
): "default" | "success" | "warning" | "danger" => {
  if (s === "closed_sar_filed") return "success";
  if (s === "closed_no_action") return "default";
  if (s === "investigating") return "warning";
  return "danger";
};

function AMLPageContent() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [cases, setCases] = useState<AMLCase[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [caseTitle, setCaseTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // GAP-84 (§29): AML mutations are compliance:write server-side; disable the
  // controls for a read-only caller so the UI enforces the same scope.
  const { can } = usePermissions();
  const canWrite = can("compliance:write");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rRes, aRes, cRes] = await Promise.all([
        adminFetch("/api/v1/admin/aml/rules"),
        adminFetch("/api/v1/admin/aml/alerts?status=open&limit=200"),
        adminFetch("/api/v1/admin/aml/cases?limit=200"),
      ]);
      if (!aRes.ok) throw new Error(`alerts request failed (${aRes.status})`);
      const aData = (await aRes.json()) as { alerts: Alert[] };
      setAlerts(aData.alerts ?? []);
      if (rRes.ok) {
        const rData = (await rRes.json()) as { rules: Rule[] };
        setRules(rData.rules ?? []);
      }
      if (cRes.ok) {
        const cData = (await cRes.json()) as { cases: AMLCase[] };
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
      const res = await adminFetch("/api/v1/admin/aml/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`scan failed (${res.status})`);
      const payload = (await res.json()) as { rowsExamined?: number };
      setNotice(`Scan complete (${payload.rowsExamined ?? 0} rows examined).`);
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
      const res = await adminFetch(`/api/v1/admin/aml/alerts/${id}/dismiss`, {
        method: "POST",
      });
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
    // All selected alerts must share one subject — a case is per-subject.
    const subjects = new Set(
      alerts.filter((a) => alertIds.includes(a.id)).map((a) => a.subjectId),
    );
    if (subjects.size !== 1) {
      setNotice("Selected alerts must belong to a single subject.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminFetch("/api/v1/admin/aml/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: caseTitle.trim(),
          priority: "high",
          subjectId: [...subjects][0],
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

  const dispositionCase = async (c: AMLCase, status: string) => {
    const closing = status.startsWith("closed_");
    const resolution = closing
      ? window.prompt("Resolution note (required to close):") || ""
      : "";
    if (closing && resolution.trim() === "") {
      setNotice("A resolution is required to close a case.");
      return;
    }
    let sarReference = "";
    if (status === "closed_sar_filed") {
      sarReference = window.prompt("SAR reference (filing id):") || "";
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminFetch(`/api/v1/admin/aml/cases/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          resolution: resolution.trim(),
          sarReference: sarReference.trim(),
        }),
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
          data-testid={`aml-alert-select-${row.id}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    { key: "ruleName", label: "Rule" },
    {
      key: "severity",
      label: "Severity",
      render: (v) => <Badge variant={sevVariant(String(v))}>{String(v)}</Badge>,
    },
    { key: "subjectId", label: "Subject" },
    { key: "riskPoints", label: "Points" },
    { key: "summary", label: "Summary" },
    {
      key: "id",
      id: "dismiss",
      label: "",
      render: (_v, row) => (
        <Button
          variant="secondary"
          size="sm"
          disabled={busy || row.status !== "open" || !canWrite}
          onClick={() => void dismiss(row.id)}
          data-testid={`aml-alert-dismiss-${row.id}`}
        >
          Dismiss
        </Button>
      ),
    },
  ];

  const caseColumns: ColumnDef<AMLCase>[] = [
    { key: "id", label: "ID" },
    { key: "subjectId", label: "Subject" },
    { key: "title", label: "Title" },
    {
      key: "status",
      label: "Status",
      render: (v) => (
        <Badge variant={caseStatusVariant(String(v))}>{String(v)}</Badge>
      ),
    },
    { key: "riskPoints", label: "Points" },
    { key: "sarReference", label: "SAR", render: (v) => String(v ?? "") },
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
            onClick={() => void dispositionCase(row, "closed_sar_filed")}
            data-testid={`aml-case-sar-${row.id}`}
          >
            File SAR &amp; close
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

  const ruleColumns: ColumnDef<Rule>[] = [
    { key: "name", label: "Rule" },
    { key: "kind", label: "Kind" },
    { key: "riskPoints", label: "Points" },
    {
      key: "severity",
      label: "Severity",
      render: (v) => <Badge variant={sevVariant(String(v))}>{String(v)}</Badge>,
    },
    {
      key: "enabled",
      label: "Enabled",
      render: (v) => (v ? "yes" : "no"),
    },
  ];

  return (
    <div className="space-y-6" data-testid="aml-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Inter',sans-serif] text-2xl font-semibold text-[var(--t1,#1a1a1a)]">
            AML Monitoring
          </h1>
          <p className="mt-1 text-sm text-[var(--t2,#4a4a4a)]">
            Money-flow alerts and cases. Rules are data — no rules loaded means
            no alerts. Triage open alerts into cases and file SARs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={runScan}
            disabled={busy || !canWrite}
          >
            Run scan
          </Button>
          <a
            className="inline-flex items-center rounded-lg border border-[var(--border-1,#e5dfd2)] px-3 py-1.5 text-sm font-medium text-[var(--accent-strong,#0e7a53)] underline-offset-2 hover:underline"
            href="/api/v1/admin/aml/export/cases.csv"
            data-testid="aml-export-cases"
          >
            Export cases (CSV)
          </a>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {notice && (
        <p
          className="text-sm text-[var(--t2,#4a4a4a)]"
          data-testid="aml-notice"
        >
          {notice}
        </p>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <Card className="p-5" data-testid="aml-rules">
            <h2 className="m-0 mb-3 text-lg font-semibold text-[var(--t1,#1a1a1a)]">
              Active Rules
            </h2>
            <DataTable
              columns={ruleColumns}
              data={rules}
              emptyMessage="No rules loaded — monitoring is inert until a rule set is configured"
            />
          </Card>

          <Card className="p-5" data-testid="aml-alerts">
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
                data-testid="aml-case-title"
              />
              <Button
                variant="primary"
                disabled={busy || !canWrite}
                onClick={openCase}
                data-testid="aml-open-case"
              >
                Open case from selection
              </Button>
            </div>
          </Card>

          <Card className="p-5" data-testid="aml-cases">
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

export default function AMLPage() {
  return (
    <ErrorBoundary>
      <AMLPageContent />
    </ErrorBoundary>
  );
}
