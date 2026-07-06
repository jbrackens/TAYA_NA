"use client";

export const dynamic = "force-dynamic";

import { PunterProfile, AccountActions } from "../../../components/users";
import type {
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

function UserDetailPageContent() {
  const params = useParams();
  const punterId = params?.id as string;
  const [punter, setPunter] = useState<PunterProfileData | null>(null);
  const [notes, setNotes] = useState<PunterNote[]>([]);
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [walletLedger, setWalletLedger] = useState<WalletLedgerRow[]>([]);
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

  useEffect(() => {
    const fetchPunter = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await loadPunter();
        await loadNotes();
        await loadHistory();
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
              body: JSON.stringify({ status: nextStatus }),
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
          />
        </div>

        <div className="h-fit">
          <AccountActions
            currentStatus={punter.status}
            onAction={handleAction}
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
