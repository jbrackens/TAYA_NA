"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-fetch";
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

interface Campaign extends Record<string, unknown> {
  id: number;
  name: string;
  campaignType: string;
  status: string;
  budgetPointsCents: number | null;
  spentPointsCents: number;
  claimCount: number;
}

interface PlayerBonus extends Record<string, unknown> {
  bonusId: number;
  userId: string;
  bonusType: string;
  status: string;
  grantedPointsCents: number;
  remainingPointsCents: number;
}

const pts = (c: number | null | undefined) =>
  c == null
    ? "—"
    : `${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} pts`;

const statusVariant = (
  s: string,
): "default" | "success" | "warning" | "danger" => {
  if (s === "active") return "success";
  if (s === "completed") return "default";
  if (s === "expired" || s === "forfeited") return "danger";
  return "warning";
};

function BonusesPageContent() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [bonuses, setBonuses] = useState<PlayerBonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Grant form
  const [grantCampaignId, setGrantCampaignId] = useState("");
  const [grantUserId, setGrantUserId] = useState("");
  const [grantReason, setGrantReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, bRes] = await Promise.all([
        adminFetch("/api/v1/admin/campaigns"),
        adminFetch("/api/v1/admin/bonuses"),
      ]);
      if (!cRes.ok)
        throw new Error(`campaigns request failed (${cRes.status})`);
      const cData = (await cRes.json()) as { campaigns: Campaign[] };
      setCampaigns(cData.campaigns ?? []);
      if (bRes.ok) {
        const bData = (await bRes.json()) as { bonuses: PlayerBonus[] };
        setBonuses(bData.bonuses ?? []);
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

  const grant = async () => {
    if (
      grantCampaignId.trim() === "" ||
      grantUserId.trim() === "" ||
      grantReason.trim() === ""
    ) {
      setNotice("Campaign, user, and reason are all required.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminFetch("/api/v1/admin/bonuses/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: Number(grantCampaignId),
          user_id: grantUserId.trim(),
          reason: grantReason.trim(),
        }),
      });
      const payload = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        throw new Error(
          payload.error?.message ?? `grant failed (${res.status})`,
        );
      }
      setNotice("Bonus granted.");
      setGrantUserId("");
      setGrantReason("");
      await load();
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const campaignColumns: ColumnDef<Campaign>[] = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "campaignType", label: "Type" },
    {
      key: "status",
      label: "Status",
      render: (v) => (
        <Badge variant={statusVariant(String(v))}>{String(v)}</Badge>
      ),
    },
    {
      key: "budgetPointsCents",
      label: "Budget",
      render: (v) => pts(v as number | null),
    },
    {
      key: "spentPointsCents",
      label: "Spent",
      render: (v) => pts(v as number),
    },
    { key: "claimCount", label: "Claims" },
  ];

  const bonusColumns: ColumnDef<PlayerBonus>[] = [
    { key: "bonusId", label: "ID" },
    { key: "userId", label: "User" },
    { key: "bonusType", label: "Type" },
    {
      key: "status",
      label: "Status",
      render: (v) => (
        <Badge variant={statusVariant(String(v))}>{String(v)}</Badge>
      ),
    },
    {
      key: "grantedPointsCents",
      label: "Granted",
      render: (v) => pts(v as number),
    },
    {
      key: "remainingPointsCents",
      label: "Remaining",
      render: (v) => pts(v as number),
    },
  ];

  return (
    <div className="space-y-6" data-testid="bonuses-page">
      <div>
        <h1 className="font-['Inter',sans-serif] text-2xl font-semibold text-[var(--t1,#1a1a1a)]">
          Bonuses &amp; Campaigns
        </h1>
        <p className="mt-1 text-sm text-[var(--t2,#4a4a4a)]">
          Campaigns and player bonuses from the bonus engine. Grant a bonus from
          an active campaign.
        </p>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {notice && (
        <p
          className="text-sm text-[var(--t2,#4a4a4a)]"
          data-testid="bonus-notice"
        >
          {notice}
        </p>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <Card className="p-5" data-testid="campaigns-card">
            <h2 className="m-0 mb-3 text-lg font-semibold text-[var(--t1,#1a1a1a)]">
              Campaigns
            </h2>
            <DataTable
              columns={campaignColumns}
              data={campaigns}
              emptyMessage="No campaigns"
            />
          </Card>

          <Card className="p-5" data-testid="grant-card">
            <h2 className="m-0 mb-3 text-lg font-semibold text-[var(--t1,#1a1a1a)]">
              Grant Bonus
            </h2>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-[var(--t2,#4a4a4a)]">
                  Campaign ID
                </label>
                <Input
                  value={grantCampaignId}
                  onChange={(e) => setGrantCampaignId(e.target.value)}
                  placeholder="e.g. 1"
                  inputMode="numeric"
                  data-testid="grant-campaign-id"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-[var(--t2,#4a4a4a)]">
                  User ID
                </label>
                <Input
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                  placeholder="user-001"
                  data-testid="grant-user-id"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[13px] font-medium text-[var(--t2,#4a4a4a)]">
                  Reason
                </label>
                <Input
                  className="w-full"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="e.g. loyalty reward"
                  data-testid="grant-reason"
                />
              </div>
              <Button
                variant="primary"
                disabled={busy}
                onClick={grant}
                data-testid="grant-submit"
              >
                Grant
              </Button>
            </div>
          </Card>

          <Card className="p-5" data-testid="bonuses-card">
            <h2 className="m-0 mb-3 text-lg font-semibold text-[var(--t1,#1a1a1a)]">
              Player Bonuses
            </h2>
            <DataTable
              columns={bonusColumns}
              data={bonuses}
              emptyMessage="No bonuses granted"
            />
          </Card>
        </>
      )}
    </div>
  );
}

export default function BonusesPage() {
  return (
    <ErrorBoundary>
      <BonusesPageContent />
    </ErrorBoundary>
  );
}
