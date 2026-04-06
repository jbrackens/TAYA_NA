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
          <h1>Account Dashboard</h1>
          <p>Manage your account settings and preferences</p>
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
            <div className="account-card-title">Settings</div>
            <div className="account-card-desc">Edit profile information</div>
          </Link>

          <Link href="/bets" className="account-card">
            <div className="account-card-icon">
              <ReceiptText size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">Bet History</div>
            <div className="account-card-desc">View all your bets</div>
          </Link>

          <Link href="/account/transactions" className="account-card">
            <div className="account-card-icon">
              <CreditCard size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">Transactions</div>
            <div className="account-card-desc">Deposits and withdrawals</div>
          </Link>

          <Link href="/account/security" className="account-card">
            <div className="account-card-icon">
              <Lock size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">Security</div>
            <div className="account-card-desc">Password and 2FA settings</div>
          </Link>

          <Link href="/account/notifications" className="account-card">
            <div className="account-card-icon">
              <Bell size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">Notifications</div>
            <div className="account-card-desc">Manage preferences</div>
          </Link>

          <Link href="/responsible-gaming" className="account-card">
            <div className="account-card-icon">
              <HeartHandshake size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">Responsible Gaming</div>
            <div className="account-card-desc">Limits and self-exclusion</div>
          </Link>
        </div>
      </div>
    </>
  );
}

const accountPageStyles = `
  .account-page { max-width: 1000px; margin: 0 auto; padding: 24px 16px; }
  .account-header { margin-bottom: 32px; }
  .account-header h1 { font-size: 32px; font-weight: 800; color: #e2e8f0; margin-bottom: 8px; }
  .account-header p { font-size: 14px; color: #D3D3D3; }

  .account-banner {
    background: #0f1225; border: 1px solid #1a1f3a; border-radius: 14px;
    padding: 24px; margin-bottom: 32px; display: flex; justify-content: space-between;
    align-items: center;
  }
  @media (max-width: 640px) {
    .account-banner { flex-direction: column; gap: 16px; align-items: flex-start; }
  }

  .account-banner-left { display: flex; align-items: center; gap: 16px; }
  .account-avatar {
    width: 56px; height: 56px; border-radius: 12px; background: #39ff14;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; font-weight: 700; color: #fff;
  }

  .account-username { font-size: 16px; font-weight: 700; color: #e2e8f0; }
  .account-email { font-size: 13px; color: #D3D3D3; margin-top: 4px; }

  .account-balance { text-align: right; }
  @media (max-width: 640px) { .account-balance { text-align: left; } }
  .account-balance-label { font-size: 12px; color: #D3D3D3; font-weight: 600; margin-bottom: 4px; }
  .account-balance-value { font-size: 24px; font-weight: 800; color: #39ff14; }

  .account-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
  }

  .account-card {
    background: #0f1225; border: 1px solid #1a1f3a; border-radius: 12px;
    padding: 20px; text-decoration: none;
    transition: all 0.2s; cursor: pointer;
  }

  .account-card:hover {
    border-color: #39ff14; background: #161a32;
    box-shadow: 0 8px 16px rgba(57, 255, 20, 0.1);
  }

  .account-card-icon {
    width: 48px; height: 48px; border-radius: 12px; margin-bottom: 12px;
    display: inline-flex; align-items: center; justify-content: center;
    color: #39ff14; background: rgba(57, 255, 20, 0.08);
    border: 1px solid rgba(57, 255, 20, 0.16);
  }
  .account-card-title { font-size: 16px; font-weight: 700; color: #e2e8f0; margin-bottom: 4px; }
  .account-card-desc { font-size: 13px; color: #D3D3D3; }
`;
