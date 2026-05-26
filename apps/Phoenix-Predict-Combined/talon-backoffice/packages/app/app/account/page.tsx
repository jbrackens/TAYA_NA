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

import { useEffect, useRef, useState } from "react";
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
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { logger } from "../lib/logger";
import { getBalance } from "../lib/api/wallet-client";
import type { Balance } from "../lib/api/wallet-client";
import type { PortfolioSummary } from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import { getPrivacy, updatePrivacy } from "../lib/api/privacy-client";
import { FEATURE_RG } from "../lib/features";

const api = createPredictionClient();

export default function AccountPage() {
  const { t } = useTranslation("account");
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
    <div className="mx-auto max-w-[1100px] px-6 pb-[60px] pt-6">
      <header className="mb-5">
        <h1 className="m-0 mb-1 text-[28px] font-extrabold tracking-[-0.02em] text-[var(--t1)]">
          {t("hub.title", "Account")}
        </h1>
        <p className="m-0 text-[13px] text-[var(--t3)]">
          {t(
            "hub.subtitle",
            "Profile, wallet, security, and notification preferences.",
          )}
        </p>
      </header>

      <section className="mb-4 flex flex-wrap items-center justify-between gap-5 rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] px-[22px] py-5">
        <div className="flex items-center gap-[14px]">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(43,228,128,0.3)] bg-[var(--accent-soft)] text-xl font-bold text-[var(--accent)]">
            {initial}
          </div>
          <div>
            <div className="text-base font-bold text-[var(--t1)]">
              {username}
            </div>
            <div className="mt-0.5 text-xs text-[var(--t3)]">{email}</div>
          </div>
        </div>
        <div className="flex flex-col gap-0.5 text-right">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--t3)]">
            {t("hub.availableBalance", "Available balance")}
          </span>
          <span className="font-mono text-[22px] font-bold tracking-[-0.01em] text-[var(--accent)] tabular-nums">
            {balance ? formatUSD(balance.availableBalance * 100) : "—"}
          </span>
        </div>
      </section>

      {summary && <PortfolioStrip summary={summary} />}

      <PrivacyCard />

      <section className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        <ActionCard
          href="/account/security"
          icon={<Settings size={20} />}
          title={t("actions.profile.title", "Profile")}
          desc={t("actions.profile.desc", "Update your details and account setup")}
        />
        <ActionCard
          href="/portfolio"
          icon={<TrendingUp size={20} />}
          title={t("actions.portfolio.title", "Portfolio")}
          desc={t("actions.portfolio.desc", "Open positions, orders, settled history")}
        />
        <ActionCard
          href="/cashier"
          icon={<Wallet size={20} />}
          title={t("actions.cashier.title", "Cashier")}
          desc={t("actions.cashier.desc", "Deposits and withdrawals")}
        />
        <ActionCard
          href="/account/transactions"
          icon={<CreditCard size={20} />}
          title={t("actions.walletActivity.title", "Wallet activity")}
          desc={t("actions.walletActivity.desc", "Ledger entries and transaction history")}
        />
        <ActionCard
          href="/account/security"
          icon={<Lock size={20} />}
          title={t("actions.security.title", "Security")}
          desc={t("actions.security.desc", "Password, sessions, and sign-in protection")}
        />
        <ActionCard
          href="/account/notifications"
          icon={<Bell size={20} />}
          title={t("actions.alerts.title", "Alerts")}
          desc={t("actions.alerts.desc", "Control market and account notifications")}
        />
        {FEATURE_RG && (
          <ActionCard
            href="/responsible-gaming"
            icon={<HeartHandshake size={20} />}
            title={t("actions.responsible.title", "Play responsibly")}
            desc={t("actions.responsible.desc", "Deposit limits, cool-offs, and self-exclusion")}
          />
        )}
      </section>
    </div>
  );
}

function PrivacyCard() {
  const { t } = useTranslation("account");
  const [displayAnonymous, setDisplayAnonymous] = useState<boolean | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // userIntent guards the mount-effect from overwriting a user-initiated
  // change under React 19 Strict Mode's double-effect in dev. Any fetch that
  // completes after a user click is stale and must not trample state.
  const userIntentRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const prefs = await getPrivacy();
        if (cancelled || userIntentRef.current) return;
        setDisplayAnonymous(prefs.displayAnonymous);
      } catch (err: unknown) {
        if (!cancelled) logger.warn("Account", "privacy fetch failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onToggle(next: boolean) {
    if (saving) return;
    userIntentRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const updated = await updatePrivacy({ displayAnonymous: next });
      setDisplayAnonymous(updated.displayAnonymous);
    } catch (err: unknown) {
      logger.warn("Account", "privacy update failed", err);
      setError(
        err instanceof Error ? err.message : t("privacy.saveError", "Couldn’t save that change"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="mb-5 rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] px-[22px] py-5"
      aria-labelledby="acct-privacy-title"
    >
      <div className="mb-[14px]">
        <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--t3)]">
          {t("privacy.kicker", "Privacy")}
        </span>
        <h2
          id="acct-privacy-title"
          className="m-0 text-base font-bold text-[var(--t1)]"
        >
          {t("privacy.title", "Appearance on public boards")}
        </h2>
      </div>
      <label className="grid cursor-pointer grid-cols-[auto_1fr] items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 h-[18px] w-[18px] cursor-pointer accent-[var(--accent)] disabled:cursor-wait disabled:opacity-60"
          checked={displayAnonymous ?? false}
          disabled={displayAnonymous === null || saving}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <div>
          <div className="mb-1 text-sm font-semibold text-[var(--t1)]">
            {t("privacy.label", "Appear anonymously on leaderboards")}
          </div>
          <div className="text-[13px] leading-normal text-[var(--t2)]">
            {t(
              "privacy.descriptionBeforeRank",
              "When on, your username is hidden on public boards and replaced with your rank (e.g.",
            )}{" "}
            <span className="font-mono tabular-nums">
              {t("privacy.rankExample", "Trader #14")}
            </span>
            {t(
              "privacy.descriptionAfterRank",
              "). Your rank and stats still show; only your handle is hidden.",
            )}
          </div>
        </div>
      </label>
      {error && (
        <div className="mt-2.5 rounded-[var(--r-sm)] border border-[rgba(255,155,107,0.2)] bg-[rgba(255,155,107,0.08)] px-3 py-2 text-xs text-[var(--no-text)]">
          {error}
        </div>
      )}
    </section>
  );
}

function PortfolioStrip({ summary }: { summary: PortfolioSummary }) {
  const { t } = useTranslation("account");
  const pnl = summary.realizedPnlCents;
  const pnlUp = pnl >= 0;
  return (
    <section className="mb-5 rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] px-[22px] py-5">
      <header className="mb-[14px] flex items-baseline justify-between gap-[14px]">
        <div>
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--t3)]">
            {t("portfolio.kicker", "Portfolio")}
          </span>
          <h2 className="m-0 text-base font-bold text-[var(--t1)]">
            {t("portfolio.title", "Your positions at a glance")}
          </h2>
        </div>
        <Link
          href="/portfolio"
          className="whitespace-nowrap text-xs font-semibold text-[var(--accent)] no-underline hover:underline"
        >
          {t("portfolio.open", "Open portfolio")} →
        </Link>
      </header>
      <div className="grid grid-cols-4 gap-3 max-[720px]:grid-cols-2">
        <Stat label={t("stats.invested", "Invested")} value={formatUSD(summary.totalValueCents)} />
        <Stat
          label={t("stats.realizedPnl", "Realized P&L")}
          value={`${pnlUp ? "+" : "−"}${formatUSD(Math.abs(pnl))}`}
          tone={pnlUp ? "gain" : "no"}
        />
        <Stat label={t("stats.openPositions", "Open positions")} value={String(summary.openPositions)} />
        <Stat
          label={t("stats.accuracy", "Accuracy")}
          value={
            summary.totalPredictions > 0
              ? `${summary.accuracyPct.toFixed(1)}%`
              : "—"
          }
          sub={
            summary.totalPredictions > 0
              ? `${summary.correctPredictions}/${summary.totalPredictions}`
              : t("stats.noSettledMarkets", "No settled markets yet")
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
  const toneClass =
    tone === "yes"
      ? "text-[var(--yes-text)]"
      : tone === "no"
        ? "text-[var(--no-text)]"
        : tone === "gain"
          ? "text-[var(--accent)]"
          : "text-[var(--t1)]";

  return (
    <div className="flex flex-col gap-0.5 rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] px-[14px] py-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--t3)]">
        {label}
      </span>
      <span className={`font-mono text-lg font-bold tabular-nums ${toneClass}`}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-[var(--t3)]">{sub}</span>}
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
    <Link
      href={href}
      className="rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] px-5 py-[18px] no-underline transition-[border-color,background,transform] duration-150 hover:-translate-y-px hover:border-[var(--accent)] hover:bg-[rgba(43,228,128,0.06)]"
    >
      <div className="mb-2.5 inline-flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] bg-[var(--accent-soft)] text-[var(--accent)]">
        {icon}
      </div>
      <div className="mb-0.5 text-sm font-bold text-[var(--t1)]">{title}</div>
      <div className="text-xs leading-normal text-[var(--t3)]">{desc}</div>
    </Link>
  );
}

function formatUSD(cents: number): string {
  if (Math.abs(cents) >= 1_000_000_00)
    return `$${(cents / 1_000_000_00).toFixed(1)}M`;
  if (Math.abs(cents) >= 10_000_00) return `$${(cents / 1_000_00).toFixed(1)}K`;
  return `$${(cents / 100).toFixed(2)}`;
}
