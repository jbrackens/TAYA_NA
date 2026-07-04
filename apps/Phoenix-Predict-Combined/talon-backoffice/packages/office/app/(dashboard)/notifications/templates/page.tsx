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

// Notification/email template editor (PAM §20 Notes, Documents & Communication
// History — template registry / OMEGA Email Control; §25 Admin Operations —
// "Email Templates" config screen; GAP-94). Consumes the live, RBAC-gated
// /api/v1/admin/notification-templates routes: GET list (notifications:read) and
// PUT {key} upsert (notifications:write, audited notification_template.updated,
// launch-copy validated). Previously the backend existed but NO office page
// reached the PUT — an operator could not create or edit template copy from the
// console. Reads gate on notifications:read; the Save control gates fail-closed
// on notifications:write (GAP-84), matching the gateway.

interface Template extends Record<string, unknown> {
  key: string;
  subject: string;
  body: string;
  updatedBy: string;
  updatedAt: string;
}

function NotificationTemplatesContent() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Editor form. editingExisting locks the key field (you edit a known
  // template); a "New template" clears it and lets the operator name a new key.
  const [formKey, setFormKey] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [editingExisting, setEditingExisting] = useState(false);

  const { can } = usePermissions();
  const canWrite = can("notifications:write");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/v1/admin/notification-templates");
      if (!res.ok) throw new Error(`Failed to load templates (${res.status})`);
      const d = await res.json();
      setTemplates(Array.isArray(d?.templates) ? d.templates : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (t: Template) => {
    setFormKey(t.key);
    setFormSubject(t.subject);
    setFormBody(t.body);
    setEditingExisting(true);
    setNotice(null);
  };

  const startNew = () => {
    setFormKey("");
    setFormSubject("");
    setFormBody("");
    setEditingExisting(false);
    setNotice(null);
  };

  const save = async () => {
    const key = formKey.trim();
    if (!key || formSubject.trim() === "" || formBody.trim() === "") return;
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(
        `/api/v1/admin/notification-templates/${encodeURIComponent(key)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: formSubject, body: formBody }),
        },
      );
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.error?.message || `Failed to save (${res.status})`);
      }
      setNotice(`Saved template "${key}"`);
      setEditingExisting(true);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setBusy(false);
    }
  };

  const columns: ColumnDef<Template>[] = [
    { key: "key", label: "Key" },
    { key: "subject", label: "Subject" },
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
          data-testid={`template-edit-${row.key}`}
        >
          Edit
        </Button>
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;
  if (error && templates.length === 0) {
    return <ErrorState message={error} onRetry={load} />;
  }

  const textAreaClassName =
    "w-full rounded border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#fff)] p-2 text-[13px] text-[var(--t1,#1a1a1a)]";

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="m-0 text-[var(--t1,#1a1a1a)]">Notification templates</h2>
        <Button
          $variant="secondary"
          $size="sm"
          onClick={startNew}
          disabled={!canWrite}
          title={
            canWrite ? undefined : "Requires the notifications:write permission"
          }
          data-testid="template-new"
        >
          New template
        </Button>
      </div>

      {notice && (
        <div
          className="mb-4 text-[13px] text-[var(--accent-lo,#1fa65e)]"
          data-testid="template-notice"
        >
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 text-[13px] text-[var(--no-text,#a8472d)]">
          {error}
        </div>
      )}

      <Card className="mb-5 p-5" data-testid="template-editor">
        <p className="mb-2 text-xs text-[var(--t3,#8b8378)]">
          Edit the subject and body of a notification/email template. Saving is
          audited. Placeholders in the copy (e.g. {"{{.Name}}"}) are rendered
          per notification.
        </p>
        <div className="mb-2">
          <Input
            placeholder="Template key (e.g. kyc_reminder)"
            value={formKey}
            onChange={(e) => setFormKey(e.target.value)}
            disabled={!canWrite || editingExisting}
            data-testid="template-key"
          />
        </div>
        <div className="mb-2">
          <Input
            placeholder="Subject"
            value={formSubject}
            onChange={(e) => setFormSubject(e.target.value)}
            disabled={!canWrite}
            data-testid="template-subject"
          />
        </div>
        <div className="mb-2">
          <textarea
            className={textAreaClassName}
            rows={6}
            placeholder="Body"
            value={formBody}
            onChange={(e) => setFormBody(e.target.value)}
            disabled={!canWrite}
            data-testid="template-body"
          />
        </div>
        <Button
          $variant="primary"
          $size="sm"
          onClick={save}
          disabled={
            busy ||
            !canWrite ||
            formKey.trim() === "" ||
            formSubject.trim() === "" ||
            formBody.trim() === ""
          }
          title={
            canWrite ? undefined : "Requires the notifications:write permission"
          }
          data-testid="template-save"
        >
          Save template
        </Button>
      </Card>

      <Card className="p-5" data-testid="templates-list">
        <DataTable
          columns={columns}
          data={templates}
          emptyMessage="No notification templates yet."
        />
      </Card>
    </div>
  );
}

export default function NotificationTemplatesPage() {
  return (
    <ErrorBoundary>
      <NotificationTemplatesContent />
    </ErrorBoundary>
  );
}
