"use client";

/**
 * AccountPage — Predict-native profile hub.
 *
 * Replaces the sportsbook-era Player Hub (loyalty tiers, leaderboards,
 * bet analytics, betting heatmap) with a prediction-native layout:
 *   [identity banner: avatar + username + available balance]
 *   [portfolio summary strip — pulled from /api/v1/portfolio/summary]
 *   [account actions grid: Profile, Portfolio, Wallet, Security, Alerts,
 *    Responsible Play]
 *
 * Loyalty, leaderboards, bet analytics, and the betting heatmap are
 * sportsbook products that don't exist on Predict yet. They'll return
 * when Predict-specific versions are designed.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CreditCard,
  HeartHandshake,
  Lock,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { logger } from "../lib/logger";
import { getBalance } from "../lib/api/wallet-client";
import type { Balance } from "../lib/api/wallet-client";
import type { PortfolioSummary } from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";

const api = createPredictionClient();

export default function AccountPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      try {
        const bal = await getBalance(user.id);
        if (!cancelled) setBalance(bal);
      } catch (err: unknown) {
        logger.warn("Account", "balance fetch failed", err);
      }
      try {
        const sum = await api.getPortfolioSummary();
        if (!cancelled) setSummary(sum);
      } catch (err: unknown) {
        logger.warn("Account", "portfolio summary fetch failed", err);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const username = user?.username ?? "—";
  const email = user?.email ?? user?.username ?? "—";
  const initial = (user?.username || user?.email || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="acct-wrap">
      <Styles />

      <header className="acct-head">
        <h1 className="acct-title">Account</h1>
        <p className="acct-sub">
          Profile, wallet, security, and notification preferences.
        </p>
      </header>

      <section className="acct-banner">
        <div className="acct-identity">
          <div className="acct-avatar">{initial}</div>
          <div>
            <div className="acct-username">{username}</div>
            <div className="acct-email">{email}</div>
          </div>
        </div>
        <div className="acct-balance">
          <span className="acct-balance-label">Available balance</span>
          <span className="acct-balance-value mono">
            {balance ? formatUSD(balance.availableBalance * 100) : "—"}
          </span>
        </div>
      </section>

      {summary && <PortfolioStrip summary={summary} />}

      <section className="acct-grid">
        <ActionCard
          href="/account/security"
          icon={<Settings size={20} />}
          title="Profile"
          desc="Update your details and account setup"
        />
        <ActionCard
          href="/portfolio"
          icon={<TrendingUp size={20} />}
          title="Portfolio"
          desc="Open positions, orders, settled history"
        />
        <ActionCard
          href="/cashier"
          icon={<Wallet size={20} />}
          title="Cashier"
          desc="Deposits and withdrawals"
        />
        <ActionCard
          href="/account/transactions"
          icon={<CreditCard size={20} />}
          title="Wallet activity"
          desc="Ledger entries and transaction history"
        />
        <ActionCard
          href="/account/security"
          icon={<Lock size={20} />}
          title="Security"
          desc="Password, sessions, and sign-in protection"
        />
        <ActionCard
          href="/account/notifications"
          icon={<Bell size={20} />}
          title="Alerts"
          desc="Control market and account notifications"
        />
        <ActionCard
          href="/responsible-gaming"
          icon={<HeartHandshake size={20} />}
          title="Play responsibly"
          desc="Deposit limits, cool-offs, and self-exclusion"
        />
      </section>
    </div>
  );
}

function PortfolioStrip({ summary }: { summary: PortfolioSummary }) {
  const pnl = summary.realizedPnlCents;
  const pnlUp = pnl >= 0;
  return (
    <section className="acct-portfolio">
      <header className="acct-portfolio-head">
        <div>
          <span className="acct-kicker">Portfolio</span>
          <h2 className="acct-portfolio-title">Your positions at a glance</h2>
        </div>
        <Link href="/portfolio" className="acct-portfolio-link">
          Open portfolio →
        </Link>
      </header>
      <div className="acct-portfolio-stats">
        <Stat label="Invested" value={formatUSD(summary.totalValueCents)} />
        <Stat
          label="Realized P&L"
          value={`${pnlUp ? "+" : "−"}${formatUSD(Math.abs(pnl))}`}
          tone={pnlUp ? "gain" : "no"}
        />
        <Stat label="Open positions" value={String(summary.openPositions)} />
        <Stat
          label="Accuracy"
          value={
            summary.totalPredictions > 0
              ? `${summary.accuracyPct.toFixed(1)}%`
              : "—"
          }
          sub={
            summary.totalPredictions > 0
              ? `${summary.correctPredictions}/${summary.totalPredictions}`
              : "No settled markets yet"
          }
          tone={summary.accuracyPct >= 50 ? "gain" : undefined}
        />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "yes" | "no" | "gain";
}) {
  return (
    <div className={`acct-stat ${tone ? `acct-stat-${tone}` : ""}`}>
      <span className="acct-stat-label">{label}</span>
      <span className="acct-stat-value mono">{value}</span>
      {sub && <span className="acct-stat-sub">{sub}</span>}
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href} className="acct-card">
      <div className="acct-card-icon">{icon}</div>
      <div className="acct-card-title">{title}</div>
      <div className="acct-card-desc">{desc}</div>
    </Link>
  );
}

function formatUSD(cents: number): string {
  if (Math.abs(cents) >= 1_000_000_00)
    return `$${(cents / 1_000_000_00).toFixed(1)}M`;
  if (Math.abs(cents) >= 10_000_00) return `$${(cents / 1_000_00).toFixed(1)}K`;
  return `$${(cents / 100).toFixed(2)}`;
}

function Styles() {
  return (
    <style>{`
      .acct-wrap {
        max-width: 1100px;
        margin: 0 auto;
        padding: 24px 24px 60px;
      }

      .acct-head { margin-bottom: 20px; }
      .acct-title {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--t1);
        margin: 0 0 4px;
      }
      .acct-sub {
        font-size: 13px;
        color: var(--t3);
        margin: 0;
      }

      .acct-banner {
        background: var(--s1);
        border: 1px solid var(--b1);
        border-radius: var(--r-md);
        padding: 20px 22px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
      }
      .acct-identity {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .acct-avatar {
        width: 48px;
        height: 48px;
        border-radius: 999px;
        background: var(--accent-soft);
        border: 1px solid rgba(57,255,20,0.3);
        color: var(--accent);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: 700;
      }
      .acct-username {
        font-size: 16px;
        font-weight: 700;
        color: var(--t1);
      }
      .acct-email {
        font-size: 12px;
        color: var(--t3);
        margin-top: 2px;
      }
      .acct-balance {
        text-align: right;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .acct-balance-label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
      }
      .acct-balance-value {
        font-size: 22px;
        font-weight: 700;
        color: var(--accent);
        letter-spacing: -0.01em;
      }

      .acct-portfolio {
        background: var(--s1);
        border: 1px solid var(--b1);
        border-radius: var(--r-md);
        padding: 20px 22px;
        margin-bottom: 20px;
      }
      .acct-portfolio-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin-bottom: 14px;
        gap: 14px;
      }
      .acct-kicker {
        display: block;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
        margin-bottom: 2px;
      }
      .acct-portfolio-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--t1);
        margin: 0;
      }
      .acct-portfolio-link {
        font-size: 12px;
        font-weight: 600;
        color: var(--accent);
        text-decoration: none;
        white-space: nowrap;
      }
      .acct-portfolio-link:hover { text-decoration: underline; }

      .acct-portfolio-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
      }
      @media (max-width: 720px) {
        .acct-portfolio-stats { grid-template-columns: repeat(2, 1fr); }
      }
      .acct-stat {
        background: var(--s2);
        border: 1px solid var(--b1);
        border-radius: var(--r-sm);
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .acct-stat-label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
      }
      .acct-stat-value {
        font-size: 18px;
        font-weight: 700;
        color: var(--t1);
      }
      .acct-stat-yes .acct-stat-value { color: var(--yes); }
      .acct-stat-no .acct-stat-value { color: var(--no); }
      .acct-stat-gain .acct-stat-value { color: var(--gain); }
      .acct-stat-sub {
        font-size: 11px;
        color: var(--t3);
      }

      .acct-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 12px;
      }
      .acct-card {
        background: var(--s1);
        border: 1px solid var(--b1);
        border-radius: var(--r-md);
        padding: 18px 20px;
        text-decoration: none;
        transition: border-color 0.15s, background 0.15s, transform 0.15s;
      }
      .acct-card:hover {
        border-color: var(--accent);
        background: var(--s1);
        transform: translateY(-1px);
      }
      .acct-card-icon {
        width: 36px;
        height: 36px;
        border-radius: var(--r-sm);
        background: var(--accent-soft);
        color: var(--accent);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 10px;
      }
      .acct-card-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--t1);
        margin-bottom: 2px;
      }
      .acct-card-desc {
        font-size: 12px;
        color: var(--t3);
        line-height: 1.5;
      }
    `}</style>
  );
}
