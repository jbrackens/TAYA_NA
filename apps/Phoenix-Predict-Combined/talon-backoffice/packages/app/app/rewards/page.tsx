"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  getLoyaltyAccount,
  getLoyaltyLedger,
  getLoyaltyTiers,
  type LoyaltyAccount,
  type LoyaltyLedgerEntry,
  type LoyaltyTier,
} from "../lib/api/loyalty-client";
import { logger } from "../lib/logger";

export default function RewardsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [ledger, setLedger] = useState<LoyaltyLedgerEntry[]>([]);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRewards() {
      if (!user?.id) {
        setAccount(null);
        setLedger([]);
        setTiers([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [accountResult, ledgerResult, tiersResult] = await Promise.all([
          getLoyaltyAccount(user.id),
          getLoyaltyLedger(user.id, 8),
          getLoyaltyTiers(),
        ]);
        if (cancelled) return;
        setAccount(accountResult);
        setLedger(ledgerResult);
        setTiers(tiersResult);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load rewards";
        logger.error("Rewards", "loyalty fetch failed", message);
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRewards();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const progress = useMemo(() => {
    if (!account || tiers.length === 0) return null;
    const activeTiers = [...tiers].sort((a, b) => a.rank - b.rank);
    const currentIndex = activeTiers.findIndex(
      (tier) => tier.tierCode === account.currentTier,
    );
    const currentTier = activeTiers[currentIndex];
    const nextTier = activeTiers.find(
      (tier) => tier.tierCode === account.nextTier,
    );
    if (!currentTier || !nextTier) {
      return {
        currentTier,
        nextTier,
        progressPct: 100,
      };
    }
    const span = Math.max(
      1,
      nextTier.minLifetimePoints - currentTier.minLifetimePoints,
    );
    const advanced = Math.max(
      0,
      account.pointsEarnedLifetime - currentTier.minLifetimePoints,
    );
    return {
      currentTier,
      nextTier,
      progressPct: Math.min(100, Math.max(0, (advanced / span) * 100)),
    };
  }, [account, tiers]);

  if (authLoading || loading) {
    return <PageState message="Loading rewards..." />;
  }

  if (!user?.id) {
    return (
      <PageState
        message="Sign in to view your rewards balance, tier progress, and recent activity."
        cta={{ href: "/auth/login", label: "Log in" }}
      />
    );
  }

  if (error) {
    return (
      <PageState
        message={error}
        cta={{ href: "/account", label: "Back to account" }}
      />
    );
  }

  return (
    <div className="rw-wrap">
      <Styles />
      <header className="rw-head">
        <div>
          <span className="rw-kicker">Rewards</span>
          <h1 className="rw-title">Loyalty center</h1>
          <p className="rw-body">
            This page now reads from the local loyalty service instead of the
            old placeholder. Your tier, points balance, and ledger activity are
            all backed by the gateway.
          </p>
        </div>
        <Link href="/portfolio" className="rw-cta">
          Open portfolio
          <ArrowRight size={14} />
        </Link>
      </header>

      <section className="rw-hero">
        <div className="rw-hero-main">
          <div className="rw-icon">
            <Sparkles size={28} strokeWidth={1.8} />
          </div>
          <div>
            <span className="rw-tier-chip">
              {displayTier(account?.currentTier || "")}
            </span>
            <h2 className="rw-hero-title">
              {account ? formatPoints(account.pointsBalance) : "—"} points
            </h2>
            <p className="rw-body">
              {account?.pointsToNextTier
                ? `${formatPoints(account.pointsToNextTier)} points to ${displayTier(account.nextTier)}`
                : "You’re at the top active tier in this local environment."}
            </p>
          </div>
        </div>
        <div className="rw-hero-stats">
          <Stat
            label="Lifetime"
            value={formatPoints(account?.pointsEarnedLifetime || 0)}
          />
          <Stat
            label="Last 7 days"
            value={formatPoints(account?.pointsEarned7D || 0)}
          />
          <Stat
            label="This month"
            value={formatPoints(account?.pointsEarnedCurrentMonth || 0)}
          />
        </div>
      </section>

      {progress && (
        <section className="rw-progress-card">
          <div className="rw-progress-head">
            <div>
              <span className="rw-progress-label">Tier progress</span>
              <h3 className="rw-progress-title">
                {displayTier(progress.currentTier?.tierCode || "")}
                {progress.nextTier
                  ? ` → ${displayTier(progress.nextTier.tierCode)}`
                  : ""}
              </h3>
            </div>
            <span className="rw-progress-value mono">
              {Math.round(progress.progressPct)}%
            </span>
          </div>
          <div className="rw-progress-track">
            <div
              className="rw-progress-fill"
              style={{ width: `${progress.progressPct}%` }}
            />
          </div>
        </section>
      )}

      <div className="rw-grid">
        <section className="rw-panel">
          <header className="rw-panel-head">
            <div>
              <span className="rw-panel-kicker">Tiers</span>
              <h3 className="rw-panel-title">Active ladder</h3>
            </div>
          </header>
          <div className="rw-tiers">
            {tiers.map((tier) => {
              const active = tier.tierCode === account?.currentTier;
              return (
                <div
                  key={tier.tierCode}
                  className={`rw-tier-card ${active ? "rw-tier-card-active" : ""}`}
                >
                  <div className="rw-tier-card-head">
                    <Star size={16} />
                    <strong>{tier.displayName}</strong>
                  </div>
                  <span className="rw-tier-threshold mono">
                    {formatPoints(tier.minLifetimePoints)} lifetime
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rw-panel">
          <header className="rw-panel-head">
            <div>
              <span className="rw-panel-kicker">Activity</span>
              <h3 className="rw-panel-title">Recent ledger</h3>
            </div>
          </header>
          {ledger.length === 0 ? (
            <div className="rw-empty">No rewards activity yet.</div>
          ) : (
            <div className="rw-ledger">
              {ledger.map((entry) => (
                <div key={entry.entryId} className="rw-ledger-row">
                  <div>
                    <strong>{entryLabel(entry)}</strong>
                    <span className="rw-ledger-meta">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="rw-ledger-values">
                    <span
                      className={`mono ${
                        entry.pointsDelta >= 0 ? "rw-positive" : "rw-negative"
                      }`}
                    >
                      {entry.pointsDelta >= 0 ? "+" : ""}
                      {formatPoints(entry.pointsDelta)}
                    </span>
                    <span className="rw-ledger-meta mono">
                      Bal {formatPoints(entry.balanceAfter)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function PageState({
  message,
  cta,
}: {
  message: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="rw-state">
      <Styles />
      <div className="rw-state-card">
        <p>{message}</p>
        {cta && (
          <Link href={cta.href} className="rw-cta">
            {cta.label}
          </Link>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rw-stat">
      <span className="rw-stat-label">{label}</span>
      <strong className="rw-stat-value mono">{value}</strong>
    </div>
  );
}

function displayTier(tierCode: string) {
  if (!tierCode) return "No tier";
  return tierCode.charAt(0).toUpperCase() + tierCode.slice(1);
}

function formatPoints(points: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(points);
}

function entryLabel(entry: LoyaltyLedgerEntry) {
  switch (entry.entryType) {
    case "accrual":
      return "Settled bet accrual";
    case "referral_bonus":
      return "Referral bonus";
    case "adjustment":
      return "Manual adjustment";
    default:
      return entry.entryType.replace(/_/g, " ");
  }
}

function Styles() {
  return (
    <style>{`
      .rw-wrap {
        max-width: 1120px;
        margin: 0 auto;
        padding: 32px 24px 60px;
      }

      .rw-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 20px;
        margin-bottom: 22px;
      }
      .rw-kicker {
        display: inline-block;
        margin-bottom: 8px;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 11px;
        font-weight: 700;
      }
      .rw-title {
        margin: 0 0 10px;
        font-size: 32px;
        font-weight: 800;
        letter-spacing: -0.03em;
        color: var(--t1);
      }
      .rw-body {
        margin: 0;
        max-width: 620px;
        font-size: 14px;
        line-height: 1.65;
        color: var(--t2);
      }

      .rw-hero,
      .rw-progress-card,
      .rw-panel,
      .rw-state-card {
        background: var(--s1);
        border: 1px solid var(--b1);
        border-radius: var(--r-lg);
      }
      .rw-hero {
        padding: 22px;
        margin-bottom: 18px;
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
        gap: 18px;
        align-items: center;
      }
      .rw-icon {
        width: 56px;
        height: 56px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .rw-hero-main {
        display: flex;
        align-items: center;
        gap: 18px;
      }
      .rw-tier-chip {
        display: inline-block;
        padding: 5px 10px;
        background: var(--s2);
        border: 1px solid var(--b1);
        color: var(--t3);
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        margin-bottom: 10px;
      }
      .rw-hero-title {
        margin: 0 0 8px;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.03em;
        color: var(--t1);
      }
      .rw-hero-stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .rw-stat {
        padding: 14px;
        border-radius: 16px;
        border: 1px solid var(--b1);
        background: var(--s2);
      }
      .rw-stat-label {
        display: block;
        margin-bottom: 8px;
        color: var(--t3);
        font-size: 12px;
      }
      .rw-stat-value {
        color: var(--t1);
        font-size: 20px;
      }

      .rw-progress-card {
        padding: 18px 20px;
        margin-bottom: 18px;
      }
      .rw-progress-head {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: center;
        margin-bottom: 14px;
      }
      .rw-progress-label,
      .rw-panel-kicker {
        display: inline-block;
        margin-bottom: 6px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accent);
      }
      .rw-progress-title,
      .rw-panel-title {
        margin: 0;
        font-size: 20px;
        font-weight: 800;
        color: var(--t1);
      }
      .rw-progress-value {
        color: var(--t1);
        font-size: 18px;
      }
      .rw-progress-track {
        height: 10px;
        border-radius: 999px;
        background: var(--s2);
        overflow: hidden;
      }
      .rw-progress-fill {
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, var(--accent), var(--accent-hi));
      }

      .rw-grid {
        display: grid;
        grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
        gap: 18px;
      }
      .rw-panel {
        padding: 20px;
      }
      .rw-panel-head {
        margin-bottom: 16px;
      }
      .rw-tiers {
        display: grid;
        gap: 12px;
      }
      .rw-tier-card {
        padding: 14px 16px;
        border-radius: 16px;
        border: 1px solid var(--b1);
        background: var(--s2);
      }
      .rw-tier-card-active {
        border-color: color-mix(in srgb, var(--accent) 50%, var(--b1));
        background: color-mix(in srgb, var(--accent) 8%, var(--s2));
      }
      .rw-tier-card-head {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
        color: var(--t1);
      }
      .rw-tier-threshold {
        font-size: 12px;
        color: var(--t3);
      }

      .rw-ledger {
        display: flex;
        flex-direction: column;
      }
      .rw-ledger-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 14px 0;
        border-top: 1px solid var(--b1);
      }
      .rw-ledger-row:first-child {
        border-top: 0;
        padding-top: 0;
      }
      .rw-ledger-values {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
      }
      .rw-ledger-meta {
        display: block;
        margin-top: 4px;
        font-size: 12px;
        color: var(--t3);
      }
      .rw-positive { color: var(--success, #2fb171); }
      .rw-negative { color: var(--danger, #d95c5c); }
      .rw-empty,
      .rw-state {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 40vh;
      }
      .rw-empty {
        color: var(--t3);
        font-size: 13px;
      }
      .rw-state-card {
        max-width: 440px;
        padding: 28px;
        text-align: center;
      }
      .rw-state-card p {
        margin: 0 0 16px;
        line-height: 1.6;
        color: var(--t2);
      }
      .rw-cta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        background: var(--accent);
        color: #06170a;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
        box-shadow: var(--accent-glow);
      }
      .rw-cta:hover { background: var(--accent-hi); }

      @media (max-width: 960px) {
        .rw-head,
        .rw-progress-head,
        .rw-hero {
          grid-template-columns: 1fr;
          flex-direction: column;
          align-items: flex-start;
        }
        .rw-grid {
          grid-template-columns: 1fr;
        }
        .rw-hero-stats {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 720px) {
        .rw-wrap {
          padding-inline: 16px;
        }
        .rw-title {
          font-size: 28px;
        }
        .rw-hero-main,
        .rw-ledger-row {
          flex-direction: column;
          align-items: flex-start;
        }
        .rw-ledger-values {
          align-items: flex-start;
        }
      }
    `}</style>
  );
}
