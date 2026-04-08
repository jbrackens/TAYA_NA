"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CreditCard,
  HeartHandshake,
  Lock,
  ReceiptText,
  Settings,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getProfile } from "../lib/api/user-client";
import { getBalance } from "../lib/api/wallet-client";
import {
  getLoyaltyAccount,
  getLoyaltyLedger,
  getLoyaltyTiers,
} from "../lib/api/loyalty-client";
import type { UserProfile } from "../lib/api/user-client";
import type { Balance } from "../lib/api/wallet-client";
import type {
  LoyaltyAccount,
  LoyaltyLedgerEntry,
  LoyaltyTier,
} from "../lib/api/loyalty-client";
import {
  colors,
  font,
  radius,
  shadow,
  spacing,
  surface,
  text,
  transition,
} from "../lib/theme";

export default function AccountPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyAccount | null>(null);
  const [loyaltyLedger, setLoyaltyLedger] = useState<LoyaltyLedgerEntry[]>([]);
  const [loyaltyTiers, setLoyaltyTiers] = useState<LoyaltyTier[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        return;
      }

      const [prof, bal, rewardsAccount, rewardsLedger, rewardsTiers] =
        await Promise.all([
          getProfile(user.id).catch(() => null),
          getBalance(user.id).catch(() => null),
          getLoyaltyAccount(user.id).catch(() => null),
          getLoyaltyLedger(user.id, 4).catch(() => []),
          getLoyaltyTiers().catch(() => []),
        ]);

      setProfile(prof);
      setBalance(bal);
      setLoyalty(rewardsAccount);
      setLoyaltyLedger(rewardsLedger);
      setLoyaltyTiers(rewardsTiers);
    };

    void load();
  }, [user?.id]);

  const currentTierName =
    loyaltyTiers.find((tier) => tier.tierCode === loyalty?.currentTier)?.displayName ||
    normalizeTierName(loyalty?.currentTier) ||
    "Bronze";
  const nextTierName =
    loyaltyTiers.find((tier) => tier.tierCode === loyalty?.nextTier)?.displayName ||
    normalizeTierName(loyalty?.nextTier);
  const tierProgressTotal =
    loyalty && loyalty.pointsToNextTier >= 0
      ? loyalty.pointsBalance + loyalty.pointsToNextTier
      : 0;
  const tierProgressPct =
    tierProgressTotal > 0 && loyalty
      ? Math.max(0, Math.min(100, (loyalty.pointsBalance / tierProgressTotal) * 100))
      : 100;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: accountPageStyles }} />
      <div className="account-page">
        <div className="account-header">
          <h1>Player Hub</h1>
          <p>Manage your TAYA NA! profile, wallet, rewards, and account controls.</p>
        </div>

        <div className="account-banner">
          <div className="account-banner-left">
            <div className="account-avatar">
              {profile?.username?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <div className="account-username">
                {profile?.username || "Loading..."}
              </div>
              <div className="account-email">
                {profile?.email || "Loading..."}
              </div>
            </div>
          </div>
          <div className="account-balance">
            <div className="account-balance-label">Available Balance</div>
            <div className="account-balance-value">
              ${balance?.availableBalance?.toFixed(2) || "—"}
            </div>
          </div>
        </div>

        <div className="loyalty-panel">
          <div className="loyalty-panel-header">
            <div>
              <div className="loyalty-kicker">Rewards</div>
              <h2 className="loyalty-title">TAYA NA! Rewards</h2>
              <p className="loyalty-subtitle">
                Earn points from settled bets and unlock sharper tier benefits over time.
              </p>
            </div>
            <div className="loyalty-tier-badge">{currentTierName}</div>
          </div>

          <div className="loyalty-stats">
            <div className="loyalty-stat-card">
              <div className="loyalty-stat-label">Points Balance</div>
              <div className="loyalty-stat-value">{loyalty?.pointsBalance ?? "—"}</div>
            </div>
            <div className="loyalty-stat-card">
              <div className="loyalty-stat-label">Lifetime Earned</div>
              <div className="loyalty-stat-value">{loyalty?.pointsEarnedLifetime ?? "—"}</div>
            </div>
            <div className="loyalty-stat-card">
              <div className="loyalty-stat-label">Next Tier</div>
              <div className="loyalty-stat-value loyalty-stat-value--small">
                {loyalty?.nextTier
                  ? `${nextTierName || normalizeTierName(loyalty.nextTier)} in ${loyalty.pointsToNextTier}`
                  : "Top tier unlocked"}
              </div>
            </div>
          </div>

          <div className="loyalty-progress-card">
            <div className="loyalty-progress-head">
              <span>Tier Progress</span>
              <span>
                {loyalty?.nextTier
                  ? `${loyalty.pointsToNextTier} points to ${nextTierName || normalizeTierName(loyalty.nextTier)}`
                  : "You are in the highest rewards tier"}
              </span>
            </div>
            <div className="loyalty-progress-track">
              <div
                className="loyalty-progress-fill"
                style={{ width: `${tierProgressPct}%` }}
              />
            </div>
          </div>

          <div className="loyalty-activity-card">
            <div className="loyalty-activity-head">
              <h3>Recent Rewards Activity</h3>
              <span>{loyaltyLedger.length} recent entries</span>
            </div>
            {loyaltyLedger.length > 0 ? (
              <div className="loyalty-activity-list">
                {loyaltyLedger.map((entry) => (
                  <div key={entry.entryId} className="loyalty-activity-row">
                    <div>
                      <div className="loyalty-activity-title">
                        {formatLedgerLabel(entry)}
                      </div>
                      <div className="loyalty-activity-meta">
                        {new Date(entry.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="loyalty-activity-points">
                      {entry.pointsDelta > 0 ? "+" : ""}
                      {entry.pointsDelta}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="loyalty-empty">
                Settle your first bet to start building your rewards balance.
              </div>
            )}
          </div>
        </div>

        <div className="account-grid">
          <Link href="/account/security" className="account-card">
            <div className="account-card-icon">
              <Settings size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">Profile</div>
            <div className="account-card-desc">Update your details and account setup</div>
          </Link>

          <Link href="/bets" className="account-card">
            <div className="account-card-icon">
              <ReceiptText size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">My Bets</div>
            <div className="account-card-desc">Track open and settled tickets</div>
          </Link>

          <Link href="/account/transactions" className="account-card">
            <div className="account-card-icon">
              <CreditCard size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">Wallet Activity</div>
            <div className="account-card-desc">Review deposits, withdrawals, and ledger movement</div>
          </Link>

          <Link href="/account/security" className="account-card">
            <div className="account-card-icon">
              <Lock size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">Account Security</div>
            <div className="account-card-desc">Passwords, verification, and sign-in protection</div>
          </Link>

          <Link href="/account/notifications" className="account-card">
            <div className="account-card-icon">
              <Bell size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">Alerts</div>
            <div className="account-card-desc">Control bet, account, and promo notifications</div>
          </Link>

          <Link href="/responsible-gaming" className="account-card">
            <div className="account-card-icon">
              <HeartHandshake size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">Play Safely</div>
            <div className="account-card-desc">Limits, cool-offs, and self-exclusion tools</div>
          </Link>
        </div>
      </div>
    </>
  );
}

function normalizeTierName(tier?: string | null): string {
  if (!tier) {
    return "";
  }
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
}

function formatLedgerLabel(entry: LoyaltyLedgerEntry): string {
  if (entry.sourceType === "bet_settlement") {
    return "Settled bet reward";
  }
  if (entry.sourceType === "admin_manual") {
    return "Manual loyalty adjustment";
  }
  return entry.entrySubtype || entry.entryType;
}

const accountPageStyles = `
  .account-page { max-width: 1000px; margin: 0 auto; padding: ${spacing["2xl"]} ${spacing.lg}; }
  .account-header { margin-bottom: ${spacing["3xl"]}; }
  .account-header h1 { font-size: ${font["5xl"]}; font-weight: ${font.extrabold}; color: ${colors.textDefault}; margin-bottom: ${spacing.sm}; letter-spacing: -0.03em; }
  .account-header p { font-size: ${font.base}; color: ${colors.textSecondary}; }

  .account-banner {
    background: ${surface.panelRaised.background}; border: ${surface.panelRaised.border}; border-radius: ${surface.panelRaised.borderRadius};
    box-shadow: ${surface.panelRaised.boxShadow};
    padding: ${spacing["2xl"]}; margin-bottom: ${spacing["3xl"]}; display: flex; justify-content: space-between;
    align-items: center;
  }
  @media (max-width: 640px) {
    .account-banner { flex-direction: column; gap: ${spacing.lg}; align-items: flex-start; }
  }

  .account-banner-left { display: flex; align-items: center; gap: ${spacing.lg}; }
  .account-avatar {
    width: 56px; height: 56px; border-radius: ${radius["2xl"]}; background: ${colors.gradient};
    display: flex; align-items: center; justify-content: center;
    font-size: ${font["3xl"]}; font-weight: ${font.bold}; color: ${colors.textPrimary};
    box-shadow: ${shadow.glow};
  }

  .account-username { font-size: ${font.lg}; font-weight: ${font.bold}; color: ${colors.textPrimary}; }
  .account-email { font-size: ${font.md}; color: ${colors.textSecondary}; margin-top: ${spacing.xs}; }

  .account-balance { text-align: right; }
  @media (max-width: 640px) { .account-balance { text-align: left; } }
  .account-balance-label {
    color: ${text.eyebrow.color};
    font-size: ${text.eyebrow.fontSize};
    font-weight: ${text.eyebrow.fontWeight};
    letter-spacing: ${text.eyebrow.letterSpacing};
    text-transform: ${text.eyebrow.textTransform};
    margin-bottom: ${spacing.xs};
  }
  .account-balance-value { font-size: ${font["3xl"]}; font-weight: ${font.extrabold}; color: ${colors.primary}; }

  .loyalty-panel {
    background: linear-gradient(180deg, rgba(8, 17, 25, 0.96), rgba(10, 23, 15, 0.94));
    border: 1px solid rgba(57, 255, 20, 0.18);
    border-radius: ${radius["2xl"]};
    box-shadow: ${shadow.glowLg};
    padding: ${spacing["2xl"]};
    margin-bottom: ${spacing["3xl"]};
  }
  .loyalty-panel-header {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.lg};
    align-items: flex-start;
    margin-bottom: ${spacing.xl};
  }
  @media (max-width: 640px) {
    .loyalty-panel-header { flex-direction: column; }
  }
  .loyalty-kicker {
    color: ${text.eyebrow.color};
    font-size: ${text.eyebrow.fontSize};
    font-weight: ${text.eyebrow.fontWeight};
    letter-spacing: ${text.eyebrow.letterSpacing};
    text-transform: ${text.eyebrow.textTransform};
    margin-bottom: ${spacing.xs};
  }
  .loyalty-title {
    margin: 0 0 ${spacing.xs};
    font-size: ${font["3xl"]};
    font-weight: ${font.extrabold};
    color: ${colors.textDefault};
  }
  .loyalty-subtitle {
    margin: 0;
    color: ${colors.textSecondary};
    font-size: ${font.md};
  }
  .loyalty-tier-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 112px;
    padding: ${spacing.sm} ${spacing.md};
    border-radius: 999px;
    background: rgba(57, 255, 20, 0.12);
    border: 1px solid rgba(57, 255, 20, 0.28);
    color: ${colors.primary};
    font-size: ${font.sm};
    font-weight: ${font.bold};
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  .loyalty-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: ${spacing.md};
    margin-bottom: ${spacing.lg};
  }
  .loyalty-stat-card, .loyalty-progress-card, .loyalty-activity-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: ${radius["2xl"]};
    padding: ${spacing.lg};
  }
  .loyalty-stat-label {
    color: ${colors.textSecondary};
    font-size: ${font.sm};
    margin-bottom: ${spacing.sm};
  }
  .loyalty-stat-value {
    color: ${colors.textDefault};
    font-size: ${font["3xl"]};
    font-weight: ${font.extrabold};
  }
  .loyalty-stat-value--small {
    font-size: ${font.lg};
    line-height: 1.35;
  }
  .loyalty-progress-card { margin-bottom: ${spacing.lg}; }
  .loyalty-progress-head {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.md};
    color: ${colors.textSecondary};
    font-size: ${font.sm};
    margin-bottom: ${spacing.md};
  }
  @media (max-width: 640px) {
    .loyalty-progress-head { flex-direction: column; }
  }
  .loyalty-progress-track {
    position: relative;
    height: 10px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    overflow: hidden;
  }
  .loyalty-progress-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #39ff14, #9cff7a);
    box-shadow: 0 0 16px rgba(57, 255, 20, 0.35);
  }
  .loyalty-activity-head {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.md};
    align-items: center;
    margin-bottom: ${spacing.md};
  }
  .loyalty-activity-head h3 {
    margin: 0;
    font-size: ${font.lg};
    color: ${colors.textDefault};
  }
  .loyalty-activity-head span {
    color: ${colors.textSecondary};
    font-size: ${font.sm};
  }
  .loyalty-activity-list {
    display: flex;
    flex-direction: column;
    gap: ${spacing.sm};
  }
  .loyalty-activity-row {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.md};
    align-items: center;
    padding: ${spacing.md};
    border-radius: ${radius.xl};
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .loyalty-activity-title {
    color: ${colors.textDefault};
    font-size: ${font.md};
    font-weight: ${font.semibold};
    margin-bottom: ${spacing.xs};
  }
  .loyalty-activity-meta {
    color: ${colors.textSecondary};
    font-size: ${font.sm};
  }
  .loyalty-activity-points {
    color: ${colors.primary};
    font-size: ${font.lg};
    font-weight: ${font.extrabold};
  }
  .loyalty-empty {
    color: ${colors.textSecondary};
    font-size: ${font.md};
  }

  .account-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: ${spacing.lg};
  }

  .account-card {
    background: ${surface.panelInteractive.background}; border: ${surface.panelInteractive.border}; border-radius: ${surface.panelInteractive.borderRadius};
    box-shadow: ${surface.panelInteractive.boxShadow};
    padding: ${spacing.xl}; text-decoration: none;
    transition: ${transition.normal}; cursor: pointer;
  }

  .account-card:hover {
    border-color: rgba(57, 255, 20, 0.3); background: ${colors.bgHover};
    box-shadow: ${shadow.glowLg};
    transform: translateY(-1px);
  }

  .account-card-icon {
    width: 48px; height: 48px; border-radius: ${radius["2xl"]}; margin-bottom: ${spacing.md};
    display: inline-flex; align-items: center; justify-content: center;
    color: ${colors.primary}; background: ${surface.chip.background};
    border: ${surface.chip.border};
  }
  .account-card-title { font-size: ${font.lg}; font-weight: ${font.bold}; color: ${colors.textDefault}; margin-bottom: ${spacing.xs}; }
  .account-card-desc { font-size: ${font.md}; color: ${colors.textSecondary}; }
`;
