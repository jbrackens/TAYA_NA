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

interface Tenant extends Record<string, unknown> {
  id: string;
  displayName: string;
  status: string;
  createdAt: string;
}

function TenantsPageContent() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // GAP-84 (§29): tenant/brand mutations are config:write server-side; disable
  // for a read-only caller.
  const { can } = usePermissions();
  const canWrite = can("config:write");
  const [notice, setNotice] = useState<string | null>(null);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/v1/admin/tenants");
      if (!res.ok) throw new Error(`tenants request failed (${res.status})`);
      const data = (await res.json()) as { tenants: Tenant[] };
      setTenants(data.tenants ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (newId.trim() === "" || newName.trim() === "") {
      setNotice("Both a slug id and a display name are required.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminFetch("/api/v1/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newId.trim(), displayName: newName.trim() }),
      });
      const payload = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        throw new Error(
          payload.error?.message ?? `create failed (${res.status})`,
        );
      }
      setNotice("Tenant created.");
      setNewId("");
      setNewName("");
      await load();
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (t: Tenant, status: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminFetch(
        `/api/v1/admin/tenants/${encodeURIComponent(t.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
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

  const columns: ColumnDef<Tenant>[] = [
    { key: "id", label: "Slug" },
    { key: "displayName", label: "Brand" },
    {
      key: "status",
      label: "Status",
      render: (v) => (
        <Badge variant={String(v) === "active" ? "success" : "danger"}>
          {String(v)}
        </Badge>
      ),
    },
    { key: "createdAt", label: "Created" },
    {
      key: "id",
      id: "actions",
      label: "Actions",
      render: (_v, row) =>
        row.status === "active" ? (
          <Button
            variant="danger"
            size="sm"
            disabled={busy || !canWrite}
            onClick={() => void setStatus(row, "suspended")}
          >
            Suspend
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            disabled={busy || !canWrite}
            onClick={() => void setStatus(row, "active")}
          >
            Activate
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-6" data-testid="tenants-page">
      <div>
        <h1 className="font-['Inter',sans-serif] text-2xl font-semibold text-[var(--t1,#1a1a1a)]">
          Tenants &amp; Brands
        </h1>
        <p className="mt-1 text-sm text-[var(--t2,#4a4a4a)]">
          The tenant directory. Query-level tenant isolation is a separate
          protected-core migration; this manages the directory only.
        </p>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {notice && (
        <p
          className="text-sm text-[var(--t2,#4a4a4a)]"
          data-testid="tenant-notice"
        >
          {notice}
        </p>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <Card className="p-5" data-testid="tenants-card">
            <DataTable
              columns={columns}
              data={tenants}
              emptyMessage="No tenants"
            />
          </Card>

          <Card className="p-5" data-testid="tenant-create-card">
            <h2 className="m-0 mb-3 text-lg font-semibold text-[var(--t1,#1a1a1a)]">
              Add Tenant
            </h2>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-[var(--t2,#4a4a4a)]">
                  Slug id
                </label>
                <Input
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  placeholder="e.g. acme"
                  data-testid="tenant-id"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[13px] font-medium text-[var(--t2,#4a4a4a)]">
                  Brand name
                </label>
                <Input
                  className="w-full"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Acme Predictions"
                  data-testid="tenant-name"
                />
              </div>
              <Button
                variant="primary"
                disabled={busy || !canWrite}
                onClick={create}
                data-testid="tenant-create"
              >
                Create
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default function TenantsPage() {
  return (
    <ErrorBoundary>
      <TenantsPageContent />
    </ErrorBoundary>
  );
}
