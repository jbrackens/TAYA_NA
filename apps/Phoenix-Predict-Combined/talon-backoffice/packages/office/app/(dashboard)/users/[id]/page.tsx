"use client";

export const dynamic = "force-dynamic";

import {
  PunterProfile,
  AccountActions,
  BalanceAdjustment,
} from "../../../components/users";
import type {
  KYCTabData,
  RGTabData,
  RiskTabData,
  PlayerBonusRow,
  PlayerCaseRow,
  PlayerCommunicationRow,
  PlayerOpenOrderRow,
  PlayerPositionRow,
  PlayerMarketEligibilityRow,
  SettlementRow,
  WalletLedgerRow,
} from "../../../components/users/PunterProfile";
import {
  ErrorBoundary,
  LoadingSpinner,
  ErrorState,
} from "../../../components/shared";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { adminFetch } from "../../../lib/admin-fetch";
import { usePermissions } from "../../../lib/permissions";

interface PunterProfileData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  lastLoginDate: string;
  status: "active" | "suspended" | "inactive";
  balance: number;
  portfolioValue: number;
  totalPredictions: number;
  openPositions: number;
  accuracyPct: number;
  pnl: number;
  unrealizedPnl: number;
  verificationStatus: "verified" | "pending" | "failed";
}

interface PunterNote {
  id: number;
  category: string;
  content: string;
  authorId?: string;
  createdAt: string;
}

const pageTitleClassName =
  "mb-6 text-[28px] font-bold text-[var(--t1,#1a1a1a)]";
const notesCardClassName =
  "mt-5 rounded-md border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#fff)] p-5";
const noteItemClassName =
  "border-b border-[var(--border-1,#e5dfd2)] py-2.5 text-[13px] text-[var(--t1,#1a1a1a)] last:border-b-0";

const toDisplayName = (email: string) =>
  email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || email;

const toUserStatus = (status: string): PunterProfileData["status"] => {
  if (status === "suspended") return "suspended";
  if (status === "active") return "active";
  return "inactive";
};

const mapPunter = (data: any): PunterProfileData => ({
  id: data.id,
  name: toDisplayName(data.email),
  email: data.email,
  avatar: toDisplayName(data.email)
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase(),
  createdAt: data.createdAt,
  lastLoginDate: data.lastLoginAt || "Never",
  status: toUserStatus(data.status),
  balance: (data.pointAccountBalanceCents ?? 0) / 100,
  portfolioValue: (data.portfolio?.portfolioValuePointsCents ?? 0) / 100,
  totalPredictions: data.portfolio?.totalPredictions ?? 0,
  openPositions: data.portfolio?.openPositions ?? 0,
  accuracyPct: data.portfolio?.accuracyPct ?? 0,
  pnl: (data.portfolio?.realizedPointsCents ?? 0) / 100,
  unrealizedPnl: (data.portfolio?.unrealizedPointsCents ?? 0) / 100,
  verificationStatus: data.status === "active" ? "verified" : "pending",
});

const mapWalletLedgerRow = (row: any): WalletLedgerRow => ({
  entryId: row.entryId,
  type: row.type,
  amountPointsCents: row.amountPointsCents ?? 0,
  balancePointsCents: row.balancePointsCents ?? 0,
  reason: row.reason,
  transactionTime: row.transactionTime,
});

const mapRisk = (d: any): RiskTabData => ({
  effectiveTier: d.effectiveTier ?? d.rating?.tier ?? "",
  computedTier: d.rating?.tier ?? "",
  score: d.rating?.score ?? 0,
  amlOpenAlertPoints: d.rating?.factors?.amlOpenAlertPoints ?? 0,
  screeningStatus: d.rating?.factors?.screeningStatus ?? "",
  overrideTier: d.rating?.overrideTier || undefined,
  overrideBy: d.rating?.overrideBy || undefined,
  overrideReason: d.rating?.overrideReason || undefined,
  computedAt: d.rating?.computedAt,
});

function UserDetailPageContent() {
  const params = useParams();
  const punterId = params?.id as string;
  const [punter, setPunter] = useState<PunterProfileData | null>(null);
  const [notes, setNotes] = useState<PunterNote[]>([]);
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [walletLedger, setWalletLedger] = useState<WalletLedgerRow[]>([]);
  const [kyc, setKyc] = useState<KYCTabData | undefined>(undefined);
  const [rg, setRg] = useState<RGTabData | undefined>(undefined);
  const [risk, setRisk] = useState<RiskTabData | undefined>(undefined);
  const [bonuses, setBonuses] = useState<PlayerBonusRow[]>([]);
  const [cases, setCases] = useState<PlayerCaseRow[]>([]);
  const [communications, setCommunications] = useState<
    PlayerCommunicationRow[]
  >([]);
  const [commTemplateKeys, setCommTemplateKeys] = useState<string[]>([]);
  const [openOrders, setOpenOrders] = useState<PlayerOpenOrderRow[]>([]);
  const [positions, setPositions] = useState<PlayerPositionRow[]>([]);
  const [eligibility, setEligibility] = useState<PlayerMarketEligibilityRow[]>(
    [],
  );
  // GAP-90 slice 2: the send form is gated on users:write, fail-closed — a
  // read-only caller (e.g. Auditor) sees it disabled. The gateway re-checks.
  const { can } = usePermissions();
  const canSendCommunications = can("users:write");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadPunter = async () => {
    const response = await adminFetch(`/api/v1/admin/punters/${punterId}/`);
    if (!response.ok) {
      throw new Error("Failed to load user");
    }
    const data = await response.json();
    setPunter(mapPunter(data));
  };

  const loadNotes = async () => {
    const response = await adminFetch(
      `/api/v1/admin/punters/${punterId}/notes`,
    );
    if (response.ok) {
      const data = await response.json();
      setNotes(Array.isArray(data?.items) ? data.items : []);
    }
  };

  // History is secondary data — failures here must not blank the whole page.
  const loadHistory = async () => {
    try {
      const [sRes, wRes] = await Promise.all([
        adminFetch(`/api/v1/admin/punters/${punterId}/settlements`),
        adminFetch(`/api/v1/admin/punters/${punterId}/wallet`),
      ]);
      if (sRes.ok) {
        const d = await sRes.json();
        setSettlements(Array.isArray(d?.items) ? d.items : []);
      }
      if (wRes.ok) {
        const d = await wRes.json();
        setWalletLedger(
          Array.isArray(d?.items) ? d.items.map(mapWalletLedgerRow) : [],
        );
      }
    } catch {
      // ignore — Trade History / Wallet tabs just stay empty
    }
  };

  // KYC is secondary data too — the tab reports "unavailable" on failure.
  const loadKYC = async () => {
    try {
      const res = await adminFetch(
        `/api/v1/admin/kyc/users/${encodeURIComponent(punterId)}`,
      );
      if (!res.ok) return;
      const d = await res.json();
      if (!d?.status) return;
      setKyc({
        status: d.status.status ?? "unknown",
        riskLevel: d.status.riskLevel,
        rejectionReason: d.status.rejectionReason,
        lastVerifiedAt: d.status.lastVerifiedAt,
        documents: Array.isArray(d.documents)
          ? d.documents.map((doc: Record<string, unknown>) => ({
              id: String(doc.id ?? ""),
              type: String(doc.type ?? ""),
              issuingCountry:
                typeof doc.issuingCountry === "string"
                  ? doc.issuingCountry
                  : undefined,
              status: String(doc.status ?? ""),
              rejectReason:
                typeof doc.rejectReason === "string"
                  ? doc.rejectReason
                  : undefined,
              submittedAt: String(doc.submittedAt ?? ""),
            }))
          : [],
      });
    } catch {
      // ignore — KYC tab reports unavailable
    }
  };

  // RG state for the Limits/self-exclusion tab — secondary, tab reports
  // "unavailable" on failure.
  const loadRG = async () => {
    try {
      const res = await adminFetch(
        `/api/v1/admin/rg/restrictions?userId=${encodeURIComponent(punterId)}`,
      );
      if (!res.ok) return;
      const d = await res.json();
      const r = d?.restrictions;
      if (!r) return;
      const mapLimit = (l: Record<string, unknown>) => ({
        period: String(l.period ?? ""),
        limitCents: Number(l.limitCents ?? 0),
        usedCents: Number(l.usedCents ?? 0),
        remainingCents: Number(l.remainingCents ?? 0),
      });
      setRg({
        isBlocked: Boolean(r.isBlocked),
        isOnCoolOff: Boolean(r.isOnCoolOff),
        coolOffUntil:
          typeof r.coolOffUntil === "string" ? r.coolOffUntil : undefined,
        isExcluded: Boolean(r.isExcluded),
        exclusionType:
          typeof r.exclusionType === "string" ? r.exclusionType : undefined,
        excludedUntil:
          typeof r.excludedUntil === "string" ? r.excludedUntil : undefined,
        depositLimits: Array.isArray(r.depositLimits)
          ? r.depositLimits.map(mapLimit)
          : [],
        betLimits: Array.isArray(r.betLimits) ? r.betLimits.map(mapLimit) : [],
        lossLimits: Array.isArray(r.lossLimits)
          ? r.lossLimits.map(mapLimit)
          : [],
      });
    } catch {
      // ignore — Limits tab reports unavailable
    }
  };

  // Risk rating (GAP-12) — secondary; a 404 means "no rating yet" and the tab
  // prompts a recompute.
  const loadRisk = async () => {
    try {
      const res = await adminFetch(
        `/api/v1/admin/risk/ratings/${encodeURIComponent(punterId)}`,
      );
      if (!res.ok) return;
      const d = await res.json();
      if (!d?.rating) return;
      setRisk(mapRisk(d));
    } catch {
      // ignore — Risk tab reports unavailable
    }
  };

  const loadBonuses = async () => {
    try {
      const res = await adminFetch(
        `/api/v1/admin/bonuses?user_id=${encodeURIComponent(punterId)}`,
      );
      if (!res.ok) return;
      const d = await res.json();
      setBonuses(Array.isArray(d?.bonuses) ? d.bonuses : []);
    } catch {
      // ignore — Bonuses tab reports none
    }
  };

  const loadCases = async () => {
    try {
      const res = await adminFetch(
        `/api/v1/admin/cases?subjectId=${encodeURIComponent(punterId)}`,
      );
      if (!res.ok) return;
      const d = await res.json();
      setCases(Array.isArray(d?.cases) ? d.cases : []);
    } catch {
      // ignore — Cases tab reports none
    }
  };

  // GAP-90 (§20 Communication History): sent-communication history for the
  // Communications tab. Degrade-safe — a 403 (no users:read) or any failure
  // leaves the tab empty rather than failing the whole profile load.
  const loadCommunications = async () => {
    try {
      const res = await adminFetch(
        `/api/v1/admin/communications/${encodeURIComponent(punterId)}`,
      );
      if (!res.ok) return;
      const d = await res.json();
      setCommunications(Array.isArray(d?.items) ? d.items : []);
    } catch {
      // ignore — Communications tab reports none
    }
  };

  // GAP-90 slice 2: template keys for the send-form dropdown. A SEPARATE
  // notifications:read grant, so a users:write-only sender legitimately gets
  // nothing here — degrade-safe: the send form then falls back to a free-text
  // template-key field rather than failing.
  const loadCommTemplates = async () => {
    try {
      const res = await adminFetch("/api/v1/admin/notification-templates");
      if (!res.ok) return;
      const d = await res.json();
      const keys = Array.isArray(d?.templates)
        ? d.templates
            .map((t: { key?: string }) => t?.key)
            .filter((k: unknown): k is string => typeof k === "string")
        : [];
      setCommTemplateKeys(keys);
    } catch {
      // ignore — send form falls back to a free-text template key
    }
  };

  // GAP-89 (§16): working orders for the Positions & Orders tab. Two fetches —
  // the admin orders filter takes a single status, and BOTH `open` and `partial`
  // are live/working states, so a single status=open would miss partially-filled
  // resting orders. Degrade-safe (403 / failure leaves the tab empty).
  const loadOpenOrders = async () => {
    try {
      const base = `/api/v1/admin/orders?userId=${encodeURIComponent(punterId)}`;
      const [openRes, partialRes] = await Promise.all([
        adminFetch(`${base}&status=open`),
        adminFetch(`${base}&status=partial`),
      ]);
      const rows: PlayerOpenOrderRow[] = [];
      for (const res of [openRes, partialRes]) {
        if (!res.ok) continue;
        const d = await res.json();
        if (Array.isArray(d?.data)) rows.push(...d.data);
      }
      setOpenOrders(rows);
    } catch {
      // ignore — Positions tab reports no open orders
    }
  };

  // GAP-89 (§16/§10): open positions + exposure for the same tab.
  const loadPositions = async () => {
    try {
      const res = await adminFetch(
        `/api/v1/admin/positions?userId=${encodeURIComponent(punterId)}`,
      );
      if (!res.ok) return;
      const d = await res.json();
      setPositions(Array.isArray(d?.data) ? d.data : []);
    } catch {
      // ignore — Positions tab reports none
    }
  };

  // GAP-93 (§15): per-market eligibility standing for the Market Eligibility tab.
  // Degrade-safe — a 403 (no compliance:read) or memory-mode 404 leaves the tab
  // empty rather than failing the whole profile load.
  const loadEligibility = async () => {
    try {
      const res = await adminFetch(
        `/api/v1/admin/market-eligibility?userId=${encodeURIComponent(punterId)}`,
      );
      if (!res.ok) return;
      const d = await res.json();
      setEligibility(Array.isArray(d?.markets) ? d.markets : []);
    } catch {
      // ignore — Market Eligibility tab reports none
    }
  };

  useEffect(() => {
    const fetchPunter = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await loadPunter();
        await loadNotes();
        await loadHistory();
        await loadKYC();
        await loadRG();
        await loadRisk();
        await loadBonuses();
        await loadCases();
        await loadCommunications();
        await loadCommTemplates();
        await loadOpenOrders();
        await loadPositions();
        await loadEligibility();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load user");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPunter();
  }, [punterId]);

  const handleAction = async (
    action: string,
    data?: Record<string, unknown>,
  ) => {
    try {
      setIsUpdatingStatus(true);
      setError(null);

      switch (action) {
        case "suspend":
        case "activate": {
          const nextStatus = action === "suspend" ? "suspended" : "active";
          const response = await adminFetch(
            `/api/v1/admin/punters/${punterId}/status/`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              // GAP-9: the gateway requires an audited reason for every
              // status change.
              body: JSON.stringify({
                status: nextStatus,
                reason: data?.reason ?? "",
              }),
            },
          );
          if (!response.ok) throw new Error(`Failed to ${action} account`);
          const result = await response.json();
          setPunter(mapPunter(result));
          break;
        }
        case "addNote": {
          const response = await adminFetch(
            `/api/v1/admin/punters/${punterId}/notes`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: data?.content || "Admin note",
                category: data?.category || "general",
              }),
            },
          );
          if (!response.ok) throw new Error("Failed to add note");
          break;
        }
        case "recomputeRisk": {
          const res = await adminFetch(
            `/api/v1/admin/risk/ratings/${punterId}/recompute`,
            { method: "POST" },
          );
          if (!res.ok) throw new Error("Failed to recompute risk rating");
          setRisk(mapRisk(await res.json()));
          break;
        }
        case "overrideRisk": {
          const res = await adminFetch(
            `/api/v1/admin/risk/ratings/${punterId}/override`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tier: data?.tier,
                reason: data?.reason,
              }),
            },
          );
          if (!res.ok) throw new Error("Failed to override risk rating");
          setRisk(mapRisk(await res.json()));
          break;
        }
        case "clearRiskOverride": {
          const res = await adminFetch(
            `/api/v1/admin/risk/ratings/${punterId}/override`,
            { method: "DELETE" },
          );
          if (!res.ok) throw new Error("Failed to clear risk override");
          setRisk(mapRisk(await res.json()));
          break;
        }
        case "sendCommunication": {
          // GAP-90 slice 2 (§20 / Scenario 12): agent-initiated templated send.
          // users:write-gated server-side, audited player.communication_sent,
          // rate-limited per actor (GAP-75), dispatch fail-closed (email only).
          const res = await adminFetch(
            `/api/v1/admin/communications/${encodeURIComponent(punterId)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                templateKey: data?.templateKey ?? "",
                channel: data?.channel ?? "email",
                data: {},
              }),
            },
          );
          if (!res.ok) throw new Error("Failed to send communication");
          await loadCommunications();
          break;
        }
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Reload punter data after any mutation
      await loadPunter();
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRetry = () => {
    setPunter(null);
    setIsLoading(true);
    setError(null);
    loadPunter()
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load user");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  if (isLoading) {
    return (
      <div>
        <h1 className={pageTitleClassName}>Loading...</h1>
        <LoadingSpinner centered={true} text="Loading user details..." />
      </div>
    );
  }

  if (error || !punter) {
    return (
      <div>
        <h1 className={pageTitleClassName}>Error</h1>
        <ErrorState
          title="Failed to load user"
          message={error || "User not found"}
          onRetry={handleRetry}
          showRetryButton={true}
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className={pageTitleClassName}>{punter.name}</h1>

      <div className="grid grid-cols-[2fr_1fr] gap-5 max-[900px]:grid-cols-1">
        <div>
          <PunterProfile
            punter={punter}
            onAction={handleAction}
            actionsAvailable={!isUpdatingStatus}
            settlements={settlements}
            walletLedger={walletLedger}
            kyc={kyc}
            rg={rg}
            risk={risk}
            bonuses={bonuses}
            cases={cases}
            communications={communications}
            canSendCommunications={canSendCommunications}
            commTemplateKeys={commTemplateKeys}
            openOrders={openOrders}
            positions={positions}
            eligibility={eligibility}
          />
        </div>

        <div className="h-fit">
          <AccountActions
            currentStatus={punter.status}
            onAction={handleAction}
          />
          <BalanceAdjustment
            userId={punter.id}
            onAdjusted={async () => {
              await loadPunter();
              await loadHistory();
            }}
          />
          <div className={notesCardClassName}>
            <h3 className="m-0 mb-4 text-base font-semibold text-[var(--t1,#1a1a1a)]">
              Admin Notes
            </h3>
            {notes.length === 0 ? (
              <p className="m-0 text-[13px] text-[var(--t3,#8b8378)]">
                No notes yet.
              </p>
            ) : (
              notes.map((note) => (
                <div className={noteItemClassName} key={note.id}>
                  {note.content}
                  <div className="mt-1 text-[11px] text-[var(--t3,#8b8378)]">
                    {note.category} ·{" "}
                    {new Date(note.createdAt).toLocaleString()}
                    {note.authorId ? ` · ${note.authorId}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserDetailPage() {
  return (
    <ErrorBoundary>
      <UserDetailPageContent />
    </ErrorBoundary>
  );
}
