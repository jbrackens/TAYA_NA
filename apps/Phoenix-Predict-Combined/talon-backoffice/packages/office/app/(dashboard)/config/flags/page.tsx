"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "../../../lib/admin-fetch";
import { usePermissions } from "../../../lib/permissions";
import {
  Button,
  Card,
  DataTable,
  ErrorBoundary,
  ErrorState,
  Input,
  LoadingSpinner,
  type ColumnDef,
} from "../../../components/shared";

// Feature-flag / Brand-Registry config editor (PAM §25 Admin Operations —
// "Brand Registry/feature flags"; §8 key-value platform config; GAP-104).
// Consumes the live, RBAC-gated /api/v1/admin/config/flags routes: GET list
// (config:read) and PUT {key} upsert (config:write, audited config.flag_updated
// with before→after values — GAP-50). Previously only the STORE existed (P2-1
// peripheral) with zero office consumers, so operators could not view or change
// platform config from the console. Editing flags can change compliance
// posture, hence the config:write gate (fail-closed here, re-checked
// server-side) and the change audit.

interface ConfigFlag extends Record<string, unknown> {
  key: string;
  value: string;
  description?: string;
  updatedBy?: string;
  updatedAt?: string;
}

function ConfigFlagsContent() {
  const [flags, setFlags] = useState<ConfigFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Editor form. editingExisting locks the key field (you edit a known flag);
  // "New flag" clears it so the operator names a new key.
  const [formKey, setFormKey] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [editingExisting, setEditingExisting] = useState(false);

  const { can } = usePermissions();
  const canWrite = can("config:write");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/v1/admin/config/flags");
      if (!res.ok) throw new Error(`Failed to load flags (${res.status})`);
      const d = await res.json();
      setFlags(Array.isArray(d?.flags) ? d.flags : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load flags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (f: ConfigFlag) => {
    setFormKey(f.key);
    setFormValue(f.value);
    setFormDescription(f.description ?? "");
    setEditingExisting(true);
    setNotice(null);
  };

  const startNew = () => {
    setFormKey("");
    setFormValue("");
    setFormDescription("");
    setEditingExisting(false);
    setNotice(null);
  };

  const save = async () => {
    const key = formKey.trim();
    if (!key) return;
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(
        `/api/v1/admin/config/flags/${encodeURIComponent(key)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            value: formValue,
            description: formDescription,
          }),
        },
      );
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.error?.message || `Failed to save (${res.status})`);
      }
      setNotice(`Saved flag "${key}" (change audited)`);
      setEditingExisting(true);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save flag");
    } finally {
      setBusy(false);
    }
  };

  const columns: ColumnDef<ConfigFlag>[] = [
    { key: "key", label: "Key" },
    { key: "value", label: "Value" },
    {
      key: "description",
      label: "Description",
      render: (v) => String(v ?? "—"),
    },
    { key: "updatedBy", label: "Updated by", render: (v) => String(v ?? "—") },
    { key: "updatedAt", label: "Updated", render: (v) => String(v ?? "—") },
    {
      key: "key",
      id: "actions",
      label: "",
      render: (_v, row) => (
        <Button
          $variant="secondary"
          $size="sm"
          onClick={() => startEdit(row)}
          data-testid={`flag-edit-${row.key}`}
        >
          Edit
        </Button>
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;
  if (error && flags.length === 0) {
    return <ErrorState message={error} onRetry={load} />;
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="m-0 text-[var(--t1,#1a1a1a)]">Config flags</h2>
        <Button
          $variant="secondary"
          $size="sm"
          onClick={startNew}
          disabled={!canWrite}
          title={canWrite ? undefined : "Requires the config:write permission"}
          data-testid="flag-new"
        >
          New flag
        </Button>
      </div>

      {notice && (
        <div
          className="mb-4 text-[13px] text-[var(--accent-lo,#1fa65e)]"
          data-testid="flag-notice"
        >
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 text-[13px] text-[var(--no-text,#a8472d)]">
          {error}
        </div>
      )}

      <Card className="mb-5 p-5" data-testid="flag-editor">
        <p className="mb-2 text-xs text-[var(--t3,#8b8378)]">
          Key-value platform configuration (Brand Registry / feature flags).
          Changing a flag can change compliance posture — every save is audited
          with the before and after values.
        </p>
        <div className="mb-2">
          <Input
            placeholder="Flag key (e.g. crm.campaign_dispatch_enabled)"
            value={formKey}
            onChange={(e) => setFormKey(e.target.value)}
            disabled={!canWrite || editingExisting}
            data-testid="flag-key"
          />
        </div>
        <div className="mb-2">
          <Input
            placeholder="Value"
            value={formValue}
            onChange={(e) => setFormValue(e.target.value)}
            disabled={!canWrite}
            data-testid="flag-value"
          />
        </div>
        <div className="mb-2">
          <Input
            placeholder="Description (optional)"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            disabled={!canWrite}
            data-testid="flag-description"
          />
        </div>
        <Button
          $variant="primary"
          $size="sm"
          onClick={save}
          disabled={busy || !canWrite || formKey.trim() === ""}
          title={canWrite ? undefined : "Requires the config:write permission"}
          data-testid="flag-save"
        >
          Save flag
        </Button>
      </Card>

      <Card className="p-5" data-testid="flags-list">
        <DataTable
          columns={columns}
          data={flags}
          emptyMessage="No config flags set."
        />
      </Card>
    </div>
  );
}

export default function ConfigFlagsPage() {
  return (
    <ErrorBoundary>
      <ConfigFlagsContent />
    </ErrorBoundary>
  );
}
