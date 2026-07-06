"use client";

export const dynamic = "force-dynamic";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ErrorBoundary,
  ErrorState,
  LoadingSpinner,
} from "../../../components/shared";
import { adminFetch } from "../../../lib/admin-fetch";

interface LoyaltyAccount {
  accountId: string;
  playerId: string;
  rank: number;
  rankName: string;
  nextRank: number;
  nextRankName: string;
  pointsBalance: number;
  pointsEarnedLifetime: number;
  pointsEarned7D: number;
  pointsEarned30D: number;
  pointsEarnedCurrentMonth: number;
  xpToNextRank: number;
  unit: "PTS";
  rankAssignedAt?: string;
  lastAccrualAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface LoyaltyLedgerEntry {
  entryId: string;
  entryType: string;
  entrySubtype?: string;
  sourceType: string;
  predictionSourceType?: string;
  sourceId: string;
  predictionSourceId?: string;
  pointsDelta: number;
  balanceAfter: number;
  createdBy?: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

interface LoyaltyTier {
  tierCode: string;
  displayName: string;
  rank?: number;
  minLifetimePoints?: number;
}

interface ReferralReward {
  referralId: string;
  referrerPlayerId: string;
  referredPlayerId: string;
  qualificationState: string;
  qualifiedAt?: string;
  createdAt: string;
}

function LoyaltyDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const playerId = params?.id as string;
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [ledger, setLedger] = useState<LoyaltyLedgerEntry[]>([]);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [referrals, setReferrals] = useState<ReferralReward[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [pointsDelta, setPointsDelta] = useState("100");
  const [reason, setReason] = useState("");
  const [entrySubtype, setEntrySubtype] = useState("goodwill");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminFetch(
        `/api/v1/admin/loyalty/accounts/${encodeURIComponent(playerId)}?limit=20`,
      );
      if (!response.ok) {
        throw new Error("Failed to load loyalty account");
      }
      const data = await response.json();
      setAccount(data.account || null);
      setLedger(Array.isArray(data.ledger) ? data.ledger : []);
      setTiers(Array.isArray(data.tiers) ? data.tiers : []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load loyalty account",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadReferrals = async () => {
    setReferralsLoading(true);
    try {
      const response = await fetch(
        `/api/v1/referrals?userId=${encodeURIComponent(playerId)}`,
      );
      if (!response.ok) {
        // Referral endpoint may 404 if no referrals exist — treat as empty
        setReferrals([]);
        return;
      }
      const data = await response.json();
      setReferrals(Array.isArray(data?.items) ? data.items : []);
    } catch (_err: unknown) {
      // Non-critical — don't block the page
      setReferrals([]);
    } finally {
      setReferralsLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
    void loadReferrals();
  }, [playerId]);

  const currentRankName = useMemo(
    () =>
      account?.rankName ||
      tiers.find((tier) => tier.rank === account?.rank)?.displayName ||
      "Unranked",
    [tiers, account?.rank, account?.rankName],
  );
  const nextRankName = useMemo(
    () => account?.nextRankName || "",
    [account?.nextRankName],
  );

  const rankProgress = useMemo(() => {
    if (!account) return null;
    const currentRankObj = tiers.find(
      (t) =>
        t.rank === account.rank ||
        t.displayName === account.rankName ||
        t.tierCode === account.rankName,
    );
    const nextRankObj = tiers.find(
      (t) =>
        t.rank === account.nextRank ||
        t.displayName === account.nextRankName ||
        t.tierCode === account.nextRankName,
    );
    if (!nextRankObj?.minLifetimePoints) return null;
    const currentMin = currentRankObj?.minLifetimePoints ?? 0;
    const nextMin = nextRankObj.minLifetimePoints;
    const range = nextMin - currentMin;
    if (range <= 0) return null;
    const earned = account.pointsEarnedLifetime - currentMin;
    const pct = Math.min(100, Math.max(0, (earned / range) * 100));
    return {
      percent: pct,
      xpToNext: account.xpToNextRank,
      nextName: nextRankObj.displayName || account.nextRankName,
      currentName: currentRankObj?.displayName || account.rankName,
    };
  }, [account, tiers]);

  const submitAdjustment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setError(null);

    const parsedDelta = Number(pointsDelta);
    if (!Number.isFinite(parsedDelta) || parsedDelta === 0) {
      setError("Points delta must be a non-zero number.");
      return;
    }
    if (!reason.trim()) {
      setError("Reason is required for auditability.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await adminFetch("/api/v1/admin/loyalty/adjustments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId,
          pointsDelta: parsedDelta,
          idempotencyKey: `office-adjust:${playerId}:${Date.now()}`,
          reason: reason.trim(),
          createdBy: "office-admin",
          entrySubtype,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to save loyalty adjustment");
      }
      await loadDetail();
      setReason("");
      setFeedback("Loyalty adjustment applied successfully.");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save loyalty adjustment",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className={pageTitleClassName}>Loading loyalty account...</h1>
        <LoadingSpinner centered={true} text="Loading loyalty details..." />
      </div>
    );
  }

  if (error && !account) {
    return (
      <ErrorState
        title="Failed to load loyalty account"
        message={error}
        onRetry={() => void loadDetail()}
        showRetryButton={true}
      />
    );
  }

  if (!account) {
    return (
      <ErrorState
        title="Loyalty account not found"
        message="The requested loyalty account could not be located."
        onRetry={() => router.push("/loyalty")}
        showRetryButton={true}
      />
    );
  }

  return (
    <div>
      <div className={headerBarClassName}>
        <div>
          <h1 className={pageTitleClassName}>
            {account.playerId}
            {account.lastAccrualAt ? (
              <span className={lastAccrualBadgeClassName}>
                Last accrual {new Date(account.lastAccrualAt).toLocaleString()}
              </span>
            ) : null}
          </h1>
          <p className={subtitleClassName}>
            Current rank {currentRankName}
            {account.nextRankName
              ? `, ${account.xpToNextRank} XP points to ${nextRankName}`
              : ", top rank unlocked"}
            .
          </p>
        </div>
        <div className={inlineActionsClassName}>
          <button
            className={buttonClassName(true)}
            onClick={() => router.push("/loyalty")}
          >
            Back to Loyalty
          </button>
          <span className={badgeClassName(rankVariant(account.rankName))}>
            {String(currentRankName).toUpperCase()}
          </span>
        </div>
      </div>

      <div className={metricsGridClassName}>
        <MetricCard
          label="Points Balance"
          value={account.pointsBalance.toLocaleString()}
        />
        <MetricCard
          label="Lifetime Earned"
          value={account.pointsEarnedLifetime.toLocaleString()}
        />
        <MetricCard
          label="7 Day Earned"
          value={account.pointsEarned7D.toLocaleString()}
        />
        <MetricCard
          label="30 Day Earned"
          value={account.pointsEarned30D.toLocaleString()}
        />
      </div>

      {rankProgress ? (
        <div className={progressContainerClassName}>
          <div className="mb-1.5 flex justify-between">
            <span className="text-[13px] font-bold text-[#39ff14]">
              {rankProgress.currentName}
            </span>
            <span className="text-xs text-[var(--t3,#8b8378)]">
              {rankProgress.xpToNext.toLocaleString()} XP points to{" "}
              {rankProgress.nextName}
            </span>
          </div>
          <progress
            className={progressClassName}
            value={rankProgress.percent}
            max={100}
            aria-label={`${rankProgress.currentName} rank progress`}
          />
        </div>
      ) : !account.nextRankName ? (
        <div className={progressContainerClassName}>
          <div className="mb-1.5 flex justify-between">
            <span className="text-[13px] font-bold text-[#39ff14]">
              {currentRankName}
            </span>
            <span className="text-xs text-[var(--accent,#2be480)]">
              Top rank reached
            </span>
          </div>
          <progress
            className={progressClassName}
            value={100}
            max={100}
            aria-label="Top rank reached"
          />
        </div>
      ) : null}

      {/* Referral Activity */}
      <div className={`${surfaceCardClassName} mb-5`}>
        <h2 className={sectionTitleClassName}>Referral Activity</h2>
        {referralsLoading ? (
          <div className={helperTextClassName}>Loading referrals...</div>
        ) : referrals.length === 0 ? (
          <div className={helperTextClassName}>
            No referral activity found for this player.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {referrals.map((ref) => (
              <div key={ref.referralId} className={referralRowClassName}>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-[var(--t1,#1a1a1a)]">
                    {ref.referrerPlayerId === playerId ? (
                      <>Referred {ref.referredPlayerId}</>
                    ) : (
                      <>Referred by {ref.referrerPlayerId}</>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--t3,#8b8378)]">
                    {new Date(ref.createdAt).toLocaleString()}
                    {ref.qualifiedAt
                      ? ` — qualified ${new Date(ref.qualifiedAt).toLocaleString()}`
                      : ""}
                  </div>
                </div>
                <span
                  className={qualificationBadgeClassName(
                    ref.qualificationState,
                  )}
                >
                  {ref.qualificationState}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={gridClassName}>
        <div>
          <div className={surfaceCardClassName}>
            <h2 className={sectionTitleClassName}>Recent Ledger</h2>
            {ledger.length > 0 ? (
              <div className={ledgerListClassName}>
                {ledger.map((entry) => (
                  <div key={entry.entryId} className={ledgerItemClassName}>
                    <div className={ledgerHeadClassName}>
                      <div>
                        <div className={ledgerTitleClassName}>
                          {formatLedgerLabel(entry)}
                        </div>
                        <div className={ledgerMetaClassName}>
                          {new Date(entry.createdAt).toLocaleString()} • source{" "}
                          {entry.predictionSourceId || entry.sourceId}
                        </div>
                      </div>
                      <div
                        className={ledgerDeltaClassName(entry.pointsDelta < 0)}
                      >
                        {entry.pointsDelta > 0 ? "+" : ""}
                        {entry.pointsDelta}
                      </div>
                    </div>
                    <div className={ledgerMetaClassName}>
                      Balance after entry: {entry.balanceAfter.toLocaleString()}
                      {entry.createdBy
                        ? ` • created by ${entry.createdBy}`
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={helperTextClassName}>
                No loyalty ledger activity recorded yet.
              </div>
            )}
          </div>
        </div>

        <div>
          <div className={surfaceCardClassName}>
            <h2 className={sectionTitleClassName}>Manual Adjustment</h2>
            <form className={formClassName} onSubmit={submitAdjustment}>
              <label className={labelClassName}>
                Points Delta
                <input
                  className={inputClassName}
                  value={pointsDelta}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setPointsDelta(event.target.value)
                  }
                  placeholder="e.g. 100 or -50"
                />
              </label>

              <label className={labelClassName}>
                Entry Subtype
                <input
                  className={inputClassName}
                  value={entrySubtype}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setEntrySubtype(event.target.value)
                  }
                  placeholder="goodwill"
                />
              </label>

              <label className={labelClassName}>
                Reason
                <textarea
                  className={textAreaClassName}
                  value={reason}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setReason(event.target.value)
                  }
                  placeholder="Explain why this adjustment is being applied"
                />
              </label>

              <div className={helperTextClassName}>
                Positive values award points. Negative values claw points back.
                Every adjustment is written to the loyalty ledger.
              </div>

              {feedback ? (
                <div className={feedbackClassName(false)}>{feedback}</div>
              ) : null}
              {error ? (
                <div className={feedbackClassName(true)}>{error}</div>
              ) : null}

              <button
                className={buttonClassName(false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Apply Adjustment"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={surfaceCardClassName}>
      <div className={metricLabelClassName}>{label}</div>
      <div className={metricValueClassName}>{value}</div>
    </div>
  );
}

function formatLedgerLabel(entry: LoyaltyLedgerEntry): string {
  const sourceType = entry.predictionSourceType || entry.sourceType;
  if (
    sourceType === "prediction_settlement" ||
    sourceType === "bet_settlement"
  ) {
    return "Settled prediction reward";
  }
  if (sourceType === "admin_manual") {
    return "Manual loyalty adjustment";
  }
  return entry.entrySubtype || entry.entryType;
}

function rankVariant(
  rankName: string,
): "default" | "success" | "warning" | "danger" {
  switch (rankName.toLowerCase()) {
    case "legend":
    case "whale":
      return "danger";
    case "sharp":
      return "warning";
    case "trader":
      return "success";
    default:
      return "default";
  }
}

function badgeClassName(
  variant: "default" | "success" | "warning" | "danger",
): string {
  const classNames: Record<typeof variant, string> = {
    default: "bg-[var(--border-1,#e5dfd2)] text-[#93c5fd]",
    success: "bg-[#065f46] text-[#dcfce7]",
    warning: "bg-[#92400e] text-[#fef3c7]",
    danger: "bg-[#7f1d1d] text-[#fee2e2]",
  };
  return `inline-block rounded px-2 py-1 text-xs font-semibold ${classNames[variant]}`;
}

function qualificationBadgeClassName(state: string): string {
  const isQualified = state === "qualified" || state === "completed";
  return [
    "inline-block rounded border px-2 py-[3px] text-[11px] font-semibold uppercase tracking-[0.05em]",
    isQualified
      ? "border-[rgba(57,255,20,0.25)] bg-[rgba(57,255,20,0.12)] text-[#39ff14]"
      : "border-[rgba(148,163,184,0.25)] bg-[rgba(148,163,184,0.12)] text-[var(--t3,#8b8378)]",
  ].join(" ");
}

function buttonClassName(secondary: boolean): string {
  return [
    "cursor-pointer rounded px-4 py-2 text-sm font-semibold opacity-100",
    secondary
      ? "border border-[var(--border-1,#e5dfd2)] bg-[var(--border-1,#e5dfd2)] text-[var(--focus-ring,#0e7a53)]"
      : "border-0 bg-[var(--focus-ring,#0e7a53)] text-[var(--bg-deep,#f7f3ed)] disabled:cursor-not-allowed",
  ].join(" ");
}

function ledgerDeltaClassName(negative: boolean): string {
  return `text-lg font-bold ${
    negative ? "text-[var(--no-text,#a8472d)]" : "text-[#39ff14]"
  }`;
}

function feedbackClassName(isError: boolean): string {
  return `text-[13px] ${isError ? "text-[#fda4af]" : "text-[#86efac]"}`;
}

/* ── Style constants ── */

const pageTitleClassName =
  "mb-2 flex flex-wrap items-baseline gap-3 text-[28px] font-bold text-[var(--t1,#1a1a1a)]";
const lastAccrualBadgeClassName =
  "whitespace-nowrap rounded border border-[#1e3a5f] bg-[rgba(15,52,96,0.6)] px-2 py-[3px] text-xs font-medium text-[var(--t3,#8b8378)]";
const subtitleClassName = "m-0 text-sm text-[var(--t2,#4a4a4a)]";
const headerBarClassName =
  "mb-6 flex flex-wrap items-start justify-between gap-4";
const inlineActionsClassName = "flex flex-wrap gap-2.5";
const metricsGridClassName =
  "mb-5 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4";
const surfaceCardClassName =
  "rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,var(--t1,#1a1a1a))] p-4";
const metricLabelClassName =
  "text-xs uppercase tracking-[0.08em] text-[var(--t3,#8b8378)]";
const metricValueClassName = "mt-2 text-2xl font-bold text-[var(--t1,#1a1a1a)]";
const gridClassName = "grid grid-cols-[2fr_1fr] gap-5";
const sectionTitleClassName =
  "m-0 mb-4 text-lg font-bold text-[var(--t1,#1a1a1a)]";
const ledgerListClassName = "flex flex-col gap-3";
const ledgerItemClassName =
  "rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[rgba(15,52,96,0.35)] p-[14px]";
const ledgerHeadClassName = "mb-2 flex items-center justify-between gap-3";
const ledgerTitleClassName =
  "text-[15px] font-semibold text-[var(--t1,#1a1a1a)]";
const ledgerMetaClassName = "text-xs leading-[1.5] text-[var(--t3,#8b8378)]";
const formClassName = "flex flex-col gap-3";
const labelClassName =
  "flex flex-col gap-1.5 text-[13px] font-semibold text-[#cbd5e1]";
const inputClassName =
  "rounded border border-[var(--border-1,#e5dfd2)] bg-[var(--border-1,#e5dfd2)] px-3 py-2.5 text-sm text-[var(--t1,#1a1a1a)]";
const textAreaClassName = `${inputClassName} min-h-24 resize-y`;
const helperTextClassName = "text-xs leading-[1.5] text-[var(--t3,#8b8378)]";

/* Progress bar styles */

const progressContainerClassName =
  "mb-5 rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,var(--t1,#1a1a1a))] p-4";
const progressClassName =
  "block h-2.5 w-full appearance-none overflow-hidden rounded-[5px] border-0 bg-[#0f172a] [&::-moz-progress-bar]:rounded-[5px] [&::-moz-progress-bar]:bg-[linear-gradient(90deg,var(--focus-ring,#0e7a53),#39ff14)] [&::-webkit-progress-bar]:rounded-[5px] [&::-webkit-progress-bar]:bg-[#0f172a] [&::-webkit-progress-value]:rounded-[5px] [&::-webkit-progress-value]:bg-[linear-gradient(90deg,var(--focus-ring,#0e7a53),#39ff14)] [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-[400ms] [&::-webkit-progress-value]:ease-[ease]";

/* Referral row styles */

const referralRowClassName =
  "flex items-center gap-3 rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[rgba(15,52,96,0.35)] p-3";

export default function LoyaltyDetailPage() {
  return (
    <ErrorBoundary>
      <LoyaltyDetailPageContent />
    </ErrorBoundary>
  );
}
