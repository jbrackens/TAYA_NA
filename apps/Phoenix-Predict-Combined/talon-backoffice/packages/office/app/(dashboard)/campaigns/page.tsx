"use client";

import { useEffect, useMemo, useState, CSSProperties } from "react";
import {
  DataTable,
  ErrorBoundary,
  ErrorState,
  SkeletonLoader,
} from "../../components/shared";
import type { ColumnDef } from "../../components/shared";

interface CampaignRow {
  id: number;
  name: string;
  campaign_type: string;
  status: string;
  start_at: string;
  end_at: string;
  claim_count: number;
  spent_cents: number;
}

interface BonusRow {
  id: number;
  user_id: string;
  bonus_type: string;
  status: string;
  granted_amount_cents: number;
  wagering_required_cents: number;
  wagering_completed_cents: number;
  expires_at: string;
}

type Tab = "campaigns" | "bonuses";

function CampaignsPageContent() {
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [bonuses, setBonuses] = useState<BonusRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Campaign form state
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [campaignType, setCampaignType] = useState("deposit_match");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [saving, setSaving] = useState(false);

  const loadCampaigns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/campaigns", {
        headers: { "X-Admin-Role": "admin" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load campaigns");
      const data = await res.json();
      setCampaigns(Array.isArray(data?.campaigns) ? data.campaigns : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally {
      setIsLoading(false);
    }
  };

  const loadBonuses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/bonuses", {
        headers: { "X-Admin-Role": "admin" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load bonuses");
      const data = await res.json();
      setBonuses(Array.isArray(data?.bonuses) ? data.bonuses : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load bonuses");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "campaigns") loadCampaigns();
    else loadBonuses();
  }, [activeTab]);

  const createCampaign = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Role": "admin",
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          campaign_type: campaignType,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          rules: [
            {
              rule_type: "reward",
              rule_config: {
                type: campaignType,
                max_bonus_cents: 5000,
                expiry_days: 30,
              },
            },
            {
              rule_type: "wagering",
              rule_config: { multiplier: 10, min_odds_decimal: 1.5 },
            },
          ],
        }),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      setShowForm(false);
      setName("");
      setStartAt("");
      setEndAt("");
      loadCampaigns();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const activateCampaign = async (id: number) => {
    try {
      await fetch(`/api/v1/admin/campaigns/${id}/activate`, {
        method: "POST",
        headers: { "X-Admin-Role": "admin" },
        credentials: "include",
      });
      loadCampaigns();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Activate failed");
    }
  };

  const closeCampaign = async (id: number) => {
    try {
      await fetch(`/api/v1/admin/campaigns/${id}/close`, {
        method: "POST",
        headers: { "X-Admin-Role": "admin" },
        credentials: "include",
      });
      loadCampaigns();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Close failed");
    }
  };

  const forfeitBonus = async (id: number) => {
    const reason = prompt("Reason for forfeiture:");
    if (!reason) return;
    try {
      await fetch(`/api/v1/admin/bonuses/${id}/forfeit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Role": "admin",
        },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      loadBonuses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Forfeit failed");
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active":
        return { bg: "rgba(34,197,94,0.15)", text: "var(--accent, #2be480)" };
      case "draft":
        return { bg: "rgba(251,191,36,0.15)", text: "var(--warn, #d97706)" };
      case "paused":
        return { bg: "rgba(96,165,250,0.15)", text: "#93c5fd" };
      case "completed":
        return { bg: "rgba(34,197,94,0.15)", text: "var(--accent, #2be480)" };
      case "expired":
      case "forfeited":
      case "closed":
        return { bg: "rgba(239,68,68,0.15)", text: "#fca5a5" };
      default:
        return { bg: "rgba(100,116,139,0.15)", text: "var(--t3, #8b8378)" };
    }
  };

  const campaignColumns: ColumnDef<CampaignRow>[] = useMemo(
    () => [
      { key: "name", header: "Name", render: (row) => row.name },
      {
        key: "type",
        header: "Type",
        render: (row) => row.campaign_type.replace(/_/g, " "),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => {
          const c = statusColor(row.status);
          return (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 600,
                backgroundColor: c.bg,
                color: c.text,
              }}
            >
              {row.status}
            </span>
          );
        },
      },
      {
        key: "claims",
        header: "Claims",
        render: (row) => String(row.claim_count),
      },
      {
        key: "spent",
        header: "Spent",
        render: (row) => `$${(row.spent_cents / 100).toFixed(2)}`,
      },
      {
        key: "actions",
        header: "",
        render: (row) => (
          <div style={{ display: "flex", gap: "4px" }}>
            {(row.status === "draft" || row.status === "paused") && (
              <button
                onClick={() => activateCampaign(row.id)}
                style={actionBtnStyle}
              >
                Activate
              </button>
            )}
            {row.status === "active" && (
              <button
                onClick={() => closeCampaign(row.id)}
                style={{
                  ...actionBtnStyle,
                  borderColor: "var(--no-text, #a8472d)",
                  color: "#fca5a5",
                }}
              >
                Close
              </button>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  const bonusColumns: ColumnDef<BonusRow>[] = useMemo(
    () => [
      {
        key: "user",
        header: "Player",
        render: (row) => row.user_id.slice(0, 12) + "...",
      },
      {
        key: "type",
        header: "Type",
        render: (row) => row.bonus_type.replace(/_/g, " "),
      },
      {
        key: "amount",
        header: "Amount",
        render: (row) => `$${(row.granted_amount_cents / 100).toFixed(2)}`,
      },
      {
        key: "progress",
        header: "Wagering",
        render: (row) => {
          if (row.wagering_required_cents <= 0) return "—";
          const pct = Math.round(
            (row.wagering_completed_cents / row.wagering_required_cents) * 100,
          );
          return `${pct}%`;
        },
      },
      {
        key: "status",
        header: "Status",
        render: (row) => {
          const c = statusColor(row.status);
          return (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 600,
                backgroundColor: c.bg,
                color: c.text,
              }}
            >
              {row.status}
            </span>
          );
        },
      },
      {
        key: "actions",
        header: "",
        render: (row) =>
          row.status === "active" ? (
            <button
              onClick={() => forfeitBonus(row.id)}
              style={{
                ...actionBtnStyle,
                borderColor: "var(--no-text, #a8472d)",
                color: "#fca5a5",
              }}
            >
              Forfeit
            </button>
          ) : null,
      },
    ],
    [],
  );

  const tabStyle = (isActive: boolean): CSSProperties => ({
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    borderBottom: isActive ? "2px solid #39ff14" : "2px solid transparent",
    color: isActive ? "var(--t1, #1a1a1a)" : "var(--t3, #8b8378)",
    background: "none",
    border: "none",
  });

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 800,
            color: "var(--t1, #1a1a1a)",
          }}
        >
          Campaigns & Bonuses
        </h1>
        {activeTab === "campaigns" && (
          <button onClick={() => setShowForm(true)} style={createBtnStyle}>
            + New Campaign
          </button>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: "4px",
          borderBottom: "1px solid var(--border-1, #e5dfd2)",
          marginBottom: "20px",
        }}
      >
        <button
          style={tabStyle(activeTab === "campaigns")}
          onClick={() => setActiveTab("campaigns")}
        >
          Campaigns
        </button>
        <button
          style={tabStyle(activeTab === "bonuses")}
          onClick={() => setActiveTab("bonuses")}
        >
          Player Bonuses
        </button>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {showForm && (
        <div style={formStyle}>
          <h3 style={{ color: "var(--t1, #1a1a1a)", marginBottom: "12px" }}>
            New Campaign
          </h3>
          <input
            placeholder="Campaign name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
          <select
            value={campaignType}
            onChange={(e) => setCampaignType(e.target.value)}
            style={inputStyle}
          >
            <option value="deposit_match">Deposit Match</option>
            <option value="freebet_grant">Free Bet Grant</option>
            <option value="odds_boost_grant">Odds Boost Grant</option>
            <option value="signup_bonus">Signup Bonus</option>
            <option value="reload_bonus">Reload Bonus</option>
          </select>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={createCampaign}
              disabled={saving || !name || !startAt || !endAt}
              style={createBtnStyle}
            >
              {saving ? "Creating..." : "Create Campaign"}
            </button>
            <button onClick={() => setShowForm(false)} style={cancelBtnStyle}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <SkeletonLoader rows={5} />
      ) : activeTab === "campaigns" ? (
        <DataTable
          data={campaigns}
          columns={campaignColumns}
          emptyMessage="No campaigns yet."
        />
      ) : (
        <DataTable
          data={bonuses}
          columns={bonusColumns}
          emptyMessage="No player bonuses found."
        />
      )}
    </div>
  );
}

const createBtnStyle: CSSProperties = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid #39ff14",
  backgroundColor: "rgba(57, 255, 20, 0.1)",
  color: "#39ff14",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
};
const cancelBtnStyle: CSSProperties = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid var(--border-1, #e5dfd2)",
  backgroundColor: "transparent",
  color: "var(--t3, #8b8378)",
  fontSize: "13px",
  cursor: "pointer",
};
const actionBtnStyle: CSSProperties = {
  padding: "4px 10px",
  borderRadius: "4px",
  border: "1px solid #39ff14",
  backgroundColor: "transparent",
  color: "#39ff14",
  fontSize: "11px",
  fontWeight: 600,
  cursor: "pointer",
};
const inputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  marginBottom: "8px",
  borderRadius: "6px",
  border: "1px solid var(--border-1, #e5dfd2)",
  backgroundColor: "var(--bg-deep, #f7f3ed)",
  color: "var(--t1, #1a1a1a)",
  fontSize: "13px",
  outline: "none",
};
const formStyle: CSSProperties = {
  padding: "20px",
  backgroundColor: "var(--surface-1, var(--t1, #1a1a1a))",
  border: "1px solid var(--border-1, #e5dfd2)",
  borderRadius: "8px",
  marginBottom: "20px",
};
const errorStyle: CSSProperties = {
  padding: "12px",
  backgroundColor: "rgba(239,68,68,0.1)",
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: "6px",
  color: "#fca5a5",
  marginBottom: "16px",
  fontSize: "13px",
};

export default function CampaignsPage() {
  return (
    <ErrorBoundary>
      <CampaignsPageContent />
    </ErrorBoundary>
  );
}
