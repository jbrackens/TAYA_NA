"use client";

import React, { useEffect, useState } from "react";
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
import { useToast } from "../components/ToastProvider";
import { getProfile } from "../lib/api/user-client";
import { getBalance } from "../lib/api/wallet-client";
import type { UserProfile } from "../lib/api/user-client";
import type { Balance } from "../lib/api/wallet-client";
import { colors, font, radius, shadow, spacing, surface, text, transition } from "../lib/theme";

export default function AccountPage() {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        const [prof, bal] = await Promise.all([
          getProfile(user.id),
          getBalance(user.id),
        ]);
        setProfile(prof);
        setBalance(bal);
      } catch (err: unknown) {
        // Silent error for now
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: accountPageStyles }} />
      <div className="account-page">
        <div className="account-header">
          <h1>Player Hub</h1>
          <p>Manage your TAYA NA! profile, wallet, and account controls.</p>
        </div>

        {/* User Info Banner */}
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

        {/* Navigation Grid */}
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
