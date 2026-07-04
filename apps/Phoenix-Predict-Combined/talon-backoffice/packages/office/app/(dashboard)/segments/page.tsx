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

interface Campaign extends Record<string, unknown> {
  id: number;
  name: string;
  tagId: number;
  actionType: string;
  actionRef: string;
  status: string;
  createdAt: string;
}

function SegmentsPageContent() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [description, setDescription] = useState("");

  // GAP-87 slice 2: Query Builder state (POST /segments/query, a segments:read
  // operation — no write gate needed).
  const [queryTagId, setQueryTagId] = useState("");
  const [queryStatus, setQueryStatus] = useState("");
  const [queryBusy, setQueryBusy] = useState(false);
  const [queryResult, setQueryResult] = useState<{
    userIds: string[];
    total: number;
  } | null>(null);

  // GAP-87 slice 3: campaign create form state.
  const [campName, setCampName] = useState("");
  const [campTagId, setCampTagId] = useState("");
  const [campActionType, setCampActionType] = useState("bonus");
  const [campActionRef, setCampActionRef] = useState("");

  const { can } = usePermissions();
  const canWrite = can("segments:write");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, cRes] = await Promise.all([
        adminFetch("/api/v1/admin/segments/tags"),
        adminFetch("/api/v1/admin/segments/campaigns"),
      ]);
      if (!tRes.ok) throw new Error(`tags request failed (${tRes.status})`);
      const tData = (await tRes.json()) as { tags: Tag[] };
      setTags(tData.tags ?? []);
      if (cRes.ok) {
        const cData = (await cRes.json()) as { campaigns: Campaign[] };
        setCampaigns(cData.campaigns ?? []);
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

  const queryBody = () => ({
    tagId: queryTagId ? Number(queryTagId) : 0,
    status: queryStatus,
    limit: 100,
  });

  const runQuery = async () => {
    setQueryBusy(true);
    setNotice(null);
    try {
      const res = await adminFetch("/api/v1/admin/segments/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryBody()),
      });
      if (!res.ok) throw new Error(`query failed (${res.status})`);
      const data = (await res.json()) as { userIds: string[]; total: number };
      setQueryResult({ userIds: data.userIds ?? [], total: data.total ?? 0 });
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : "Query failed");
    } finally {
      setQueryBusy(false);
    }
  };

  const exportCsv = async () => {
    setQueryBusy(true);
    setNotice(null);
    try {
      const res = await adminFetch("/api/v1/admin/segments/query?format=csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryBody()),
      });
      if (!res.ok) throw new Error(`export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "segment-query.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : "Export failed");
    } finally {
      setQueryBusy(false);
    }
  };

  const createCampaign = async () => {
    if (campName.trim() === "" || campTagId === "") return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminFetch("/api/v1/admin/segments/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campName.trim(),
          tagId: Number(campTagId),
          actionType: campActionType.trim(),
          actionRef: campActionRef.trim(),
        }),
      });
      if (!res.ok) throw new Error(`create failed (${res.status})`);
      setCampName("");
      setCampActionRef("");
      setNotice("Campaign created.");
      await load();
    } catch (err: unknown) {
      setNotice(
        err instanceof Error ? err.message : "Failed to create campaign",
      );
    } finally {
      setBusy(false);
    }
  };

  const tagName = (id: number) =>
    tags.find((t) => t.id === id)?.name ?? String(id);

  const campaignColumns: ColumnDef<Campaign>[] = [
    { key: "name", label: "Campaign" },
    { key: "tagId", label: "Target tag", render: (v) => tagName(Number(v)) },
    { key: "actionType", label: "Action" },
    { key: "status", label: "Status" },
  ];

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

          <Card className="mb-5 p-5" data-testid="segments-query">
            <h2 className="m-0 mb-3 text-lg font-semibold text-[var(--t1,#1a1a1a)]">
              Query builder
            </h2>
            <p className="mb-3 text-sm text-[var(--t2,#4a4a4a)]">
              Build an ad-hoc segment by tag and account status, then export the
              matched members.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <select
                className="rounded border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] p-2 text-[13px] text-[var(--t1,#1a1a1a)]"
                value={queryTagId}
                onChange={(e) => setQueryTagId(e.target.value)}
                data-testid="segments-query-tag"
              >
                <option value="">Any tag</option>
                {tags.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] p-2 text-[13px] text-[var(--t1,#1a1a1a)]"
                value={queryStatus}
                onChange={(e) => setQueryStatus(e.target.value)}
                data-testid="segments-query-status"
              >
                <option value="">Any status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="self_excluded">Self-excluded</option>
                <option value="deactivated">Deactivated</option>
              </select>
              <Button
                variant="primary"
                disabled={queryBusy}
                onClick={() => void runQuery()}
                data-testid="segments-query-run"
              >
                Run
              </Button>
              <Button
                variant="secondary"
                disabled={queryBusy}
                onClick={() => void exportCsv()}
                data-testid="segments-query-export"
              >
                Export CSV
              </Button>
            </div>
            {queryResult && (
              <div className="mt-4" data-testid="segments-query-result">
                <p className="mb-2 text-sm font-semibold text-[var(--t1,#1a1a1a)]">
                  {queryResult.total} matching{" "}
                  {queryResult.total === 1 ? "player" : "players"}
                  {queryResult.userIds.length < queryResult.total
                    ? ` (showing ${queryResult.userIds.length})`
                    : ""}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {queryResult.userIds.map((id) => (
                    <span
                      key={id}
                      className="rounded bg-[var(--border-1,#e5dfd2)] px-2 py-0.5 text-[11px] text-[var(--t2,#4a4a4a)]"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            )}
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

          <Card className="mt-5 p-5" data-testid="segments-campaigns">
            <h2 className="m-0 mb-3 text-lg font-semibold text-[var(--t1,#1a1a1a)]">
              Campaigns
            </h2>
            <p className="mb-3 text-sm text-[var(--t2,#4a4a4a)]">
              A campaign targets a tag with an action. Creating a campaign is a
              draft; dispatch (sending) is a separate, gated step.
            </p>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <Input
                placeholder="Campaign name"
                value={campName}
                onChange={(e) => setCampName(e.target.value)}
                data-testid="segments-campaign-name"
              />
              <select
                className="rounded border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] p-2 text-[13px] text-[var(--t1,#1a1a1a)]"
                value={campTagId}
                onChange={(e) => setCampTagId(e.target.value)}
                data-testid="segments-campaign-tag"
              >
                <option value="">Target tag…</option>
                {tags.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] p-2 text-[13px] text-[var(--t1,#1a1a1a)]"
                value={campActionType}
                onChange={(e) => setCampActionType(e.target.value)}
                data-testid="segments-campaign-action"
              >
                <option value="bonus">Bonus</option>
                <option value="notification">Notification</option>
              </select>
              <Input
                placeholder="Action ref (optional)"
                value={campActionRef}
                onChange={(e) => setCampActionRef(e.target.value)}
                data-testid="segments-campaign-ref"
              />
              <Button
                variant="primary"
                disabled={
                  busy ||
                  campName.trim() === "" ||
                  campTagId === "" ||
                  !canWrite
                }
                onClick={() => void createCampaign()}
                data-testid="segments-campaign-submit"
                title={
                  canWrite
                    ? undefined
                    : "Requires the segments:write permission"
                }
              >
                Create campaign
              </Button>
            </div>
            <DataTable
              columns={campaignColumns}
              data={campaigns}
              emptyMessage="No campaigns yet"
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
