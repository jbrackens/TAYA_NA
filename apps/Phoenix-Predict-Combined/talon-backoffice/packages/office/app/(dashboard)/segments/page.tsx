"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-fetch";
import { usePermissions } from "../../lib/permissions";
import {
  Button,
  Card,
  DataTable,
  ErrorBoundary,
  ErrorState,
  Input,
  LoadingSpinner,
  type ColumnDef,
} from "../../components/shared";

// Segmentation / CRM operator surface (PAM §21 Segmentation, CRM, Bonuses,
// Rewards, and Lifecycle; GAP-87 slice 1: tag management). Consumes the live,
// RBAC-gated /api/v1/admin/segments/tags routes so an operator can view, create,
// and remove segmentation tags — previously the backend existed but no office UI
// reached it. Reads gate on segments:read; the create/delete controls gate on
// segments:write (GAP-84 read-only enforcement), matching the gateway. The
// GAP-85 marketing-crm role holds exactly these permissions.

interface Tag extends Record<string, unknown> {
  id: number;
  name: string;
  description: string;
  group: string;
  memberCount: number;
  createdAt: string;
}

function SegmentsPageContent() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [description, setDescription] = useState("");

  const { can } = usePermissions();
  const canWrite = can("segments:write");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/v1/admin/segments/tags");
      if (!res.ok) throw new Error(`tags request failed (${res.status})`);
      const data = (await res.json()) as { tags: Tag[] };
      setTags(data.tags ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createTag = async () => {
    if (name.trim() === "") return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminFetch("/api/v1/admin/segments/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          group: group.trim(),
          description: description.trim(),
        }),
      });
      if (!res.ok) throw new Error(`create failed (${res.status})`);
      setName("");
      setGroup("");
      setDescription("");
      setNotice("Tag created.");
      await load();
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : "Failed to create tag");
    } finally {
      setBusy(false);
    }
  };

  const deleteTag = async (id: number) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminFetch(`/api/v1/admin/segments/tags/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`delete failed (${res.status})`);
      await load();
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : "Failed to delete tag");
    } finally {
      setBusy(false);
    }
  };

  const columns: ColumnDef<Tag>[] = [
    { key: "name", label: "Tag" },
    { key: "group", label: "Group", render: (v) => String(v ?? "") },
    {
      key: "description",
      label: "Description",
      render: (v) => String(v ?? ""),
    },
    { key: "memberCount", label: "Members" },
    {
      key: "id",
      id: "delete",
      label: "",
      render: (_v, row) => (
        <Button
          variant="secondary"
          size="sm"
          disabled={busy || !canWrite}
          onClick={() => void deleteTag(row.id)}
          data-testid={`segment-tag-delete-${row.id}`}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-[28px] font-bold text-[var(--t1,#1a1a1a)]">
        Segments
      </h1>
      <p className="mb-4 text-sm text-[var(--t2,#4a4a4a)]">
        Segmentation tags group players for CRM campaigns and reporting. Reads
        require segments:read; creating or removing a tag requires
        segments:write.
      </p>

      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {notice && (
        <p
          className="mb-3 text-sm text-[var(--t2,#4a4a4a)]"
          data-testid="segments-notice"
        >
          {notice}
        </p>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <Card className="mb-5 p-5" data-testid="segments-create">
            <h2 className="m-0 mb-3 text-lg font-semibold text-[var(--t1,#1a1a1a)]">
              Create tag
            </h2>
            <div className="flex flex-wrap items-end gap-3">
              <Input
                placeholder="Tag name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="segments-name"
              />
              <Input
                placeholder="Group (optional)"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                data-testid="segments-group"
              />
              <Input
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="segments-description"
              />
              <Button
                variant="primary"
                disabled={busy || name.trim() === "" || !canWrite}
                onClick={() => void createTag()}
                data-testid="segments-create-submit"
                title={
                  canWrite
                    ? undefined
                    : "Requires the segments:write permission"
                }
              >
                Create
              </Button>
            </div>
          </Card>

          <Card className="p-5" data-testid="segments-tags">
            <h2 className="m-0 mb-3 text-lg font-semibold text-[var(--t1,#1a1a1a)]">
              Tags
            </h2>
            <DataTable
              columns={columns}
              data={tags}
              emptyMessage="No tags yet"
            />
          </Card>
        </>
      )}
    </div>
  );
}

export default function SegmentsPage() {
  return (
    <ErrorBoundary>
      <SegmentsPageContent />
    </ErrorBoundary>
  );
}
