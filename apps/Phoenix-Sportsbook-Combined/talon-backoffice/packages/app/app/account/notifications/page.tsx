"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/ToastProvider";
import { updatePreferences } from "../../lib/api/user-client";
import { UpdatePreferencesRequest } from "../../lib/api/user-client";

export default function NotificationsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [prefs, setPrefs] = useState({
    notification_email: true,
    notification_sms: false,
    notification_push: true,
    marketing_email: false,
  });
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Email frequency
  const [emailFrequency, setEmailFrequency] = useState<
    "instant" | "daily" | "weekly"
  >("instant");

  // Notification categories
  const [categories, setCategories] = useState({
    bet_results: true,
    promotions: true,
    account_updates: true,
    new_markets: false,
    odds_alerts: false,
  });

  const handleCategoryToggle = (key: keyof typeof categories) => {
    setCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Load preferences on mount
  useEffect(() => {
    // In a real app, we'd fetch this from the API
    // For now, using default state above
  }, [user?.id]);

  const handleToggle = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setSaveLoading(true);
    try {
      await updatePreferences(user.id, prefs);
      toast.success(
        "Preferences saved",
        "Your notification preferences have been updated",
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const msg = message || "Failed to save preferences";
      toast.error("Save failed", msg);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: notificationsStyles }} />
      <div className="notif-page">
        <div className="notif-header">
          <div>
            <h1>Notification Preferences</h1>
            <p>Choose how you want to receive updates</p>
          </div>
          <Link href="/account" className="notif-back">
            ← Back
          </Link>
        </div>

        {/* Notification Settings Card */}
        <div className="notif-card">
          <h2>Communication Channels</h2>
          <p className="notif-desc">
            Select which channels you want to receive notifications on
          </p>

          <div className="notif-settings">
            {/* Email Notifications */}
            <div className="notif-item">
              <div className="notif-item-info">
                <div className="notif-item-title">Email Notifications</div>
                <div className="notif-item-desc">
                  Receive notifications about your account activity via email
                </div>
              </div>
              <label className="notif-toggle">
                <input
                  type="checkbox"
                  checked={prefs.notification_email}
                  onChange={() => handleToggle("notification_email")}
                />
                <span className="notif-toggle-slider"></span>
              </label>
            </div>

            {/* SMS Notifications */}
            <div className="notif-item">
              <div className="notif-item-info">
                <div className="notif-item-title">SMS Notifications</div>
                <div className="notif-item-desc">
                  Receive important alerts via text message
                </div>
              </div>
              <label className="notif-toggle">
                <input
                  type="checkbox"
                  checked={prefs.notification_sms}
                  onChange={() => handleToggle("notification_sms")}
                />
                <span className="notif-toggle-slider"></span>
              </label>
            </div>

            {/* Push Notifications */}
            <div className="notif-item">
              <div className="notif-item-info">
                <div className="notif-item-title">Push Notifications</div>
                <div className="notif-item-desc">
                  Get real-time notifications on your browser or mobile app
                </div>
              </div>
              <label className="notif-toggle">
                <input
                  type="checkbox"
                  checked={prefs.notification_push}
                  onChange={() => handleToggle("notification_push")}
                />
                <span className="notif-toggle-slider"></span>
              </label>
            </div>

            {/* Marketing Email */}
            <div className="notif-item">
              <div className="notif-item-info">
                <div className="notif-item-title">Marketing Emails</div>
                <div className="notif-item-desc">
                  Receive emails about new features, promotions, and special
                  offers
                </div>
              </div>
              <label className="notif-toggle">
                <input
                  type="checkbox"
                  checked={prefs.marketing_email}
                  onChange={() => handleToggle("marketing_email")}
                />
                <span className="notif-toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Email Frequency */}
          <div style={{ marginBottom: "24px" }}>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#e2e8f0",
                marginBottom: "12px",
              }}
            >
              Email Frequency
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {([
                {
                  value: "instant",
                  label: "Instant",
                  desc: "Receive emails as events happen",
                },
                {
                  value: "daily",
                  label: "Daily Digest",
                  desc: "One summary email per day",
                },
                {
                  value: "weekly",
                  label: "Weekly Digest",
                  desc: "One summary email per week",
                },
              ] as const).map((opt) => (
                <label
                  key={opt.value}
                  className="notif-item"
                  style={{ cursor: "pointer" }}
                >
                  <div className="notif-item-info">
                    <div className="notif-item-title">{opt.label}</div>
                    <div className="notif-item-desc">{opt.desc}</div>
                  </div>
                  <input
                    type="radio"
                    name="emailFrequency"
                    value={opt.value}
                    checked={emailFrequency === opt.value}
                    onChange={() => setEmailFrequency(opt.value)}
                    style={{
                      width: "18px",
                      height: "18px",
                      accentColor: "#f97316",
                    }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Notification Categories */}
          <div style={{ marginBottom: "24px" }}>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#e2e8f0",
                marginBottom: "12px",
              }}
            >
              Notification Categories
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {[
                {
                  key: "bet_results" as const,
                  label: "Bet Results",
                  desc: "Get notified when your bets are settled",
                },
                {
                  key: "promotions" as const,
                  label: "Promotions",
                  desc: "Special offers, bonuses, and promotional events",
                },
                {
                  key: "account_updates" as const,
                  label: "Account Updates",
                  desc:
                    "Deposit confirmations, withdrawal status, and security alerts",
                },
                {
                  key: "new_markets" as const,
                  label: "New Markets",
                  desc: "Be notified when new sports or leagues are added",
                },
                {
                  key: "odds_alerts" as const,
                  label: "Odds Alerts",
                  desc:
                    "Get alerted when odds change significantly on your favorites",
                },
              ].map((cat) => (
                <label
                  key={cat.key}
                  className="notif-item"
                  style={{ cursor: "pointer" }}
                >
                  <div className="notif-item-info">
                    <div className="notif-item-title">{cat.label}</div>
                    <div className="notif-item-desc">{cat.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={categories[cat.key]}
                    onChange={() => handleCategoryToggle(cat.key)}
                    style={{
                      width: "18px",
                      height: "18px",
                      accentColor: "#f97316",
                    }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="notif-actions">
            <button
              className="notif-save-btn"
              onClick={handleSave}
              disabled={saveLoading}
            >
              {saveLoading ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </div>

        {/* Notification Types Info */}
        <div className="notif-info-card">
          <h3>What You'll Receive</h3>
          <div className="notif-info-grid">
            <div className="notif-info-item">
              <div className="notif-info-icon">📢</div>
              <div className="notif-info-title">Announcements</div>
              <div className="notif-info-desc">
                Important updates about your account and our service
              </div>
            </div>

            <div className="notif-info-item">
              <div className="notif-info-icon">🎁</div>
              <div className="notif-info-title">Promotions</div>
              <div className="notif-info-desc">
                Special offers and bonus opportunities
              </div>
            </div>

            <div className="notif-info-item">
              <div className="notif-info-icon">📅</div>
              <div className="notif-info-title">Subscription Updates</div>
              <div className="notif-info-desc">
                Renewal reminders and billing notifications
              </div>
            </div>

            <div className="notif-info-item">
              <div className="notif-info-icon">🔐</div>
              <div className="notif-info-title">Sign-in Notifications</div>
              <div className="notif-info-desc">
                Alerts when your account is accessed
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const notificationsStyles = `
  .notif-page { max-width: 800px; margin: 0 auto; padding: 24px 16px; }

  .notif-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 32px;
  }
  @media (max-width: 640px) {
    .notif-header { flex-direction: column; gap: 16px; }
  }

  .notif-header h1 { font-size: 28px; font-weight: 800; color: #e2e8f0; margin-bottom: 4px; }
  .notif-header p { font-size: 14px; color: #64748b; }

  .notif-back {
    padding: 10px 16px; background: #0f1225; border: 1px solid #1a1f3a;
    border-radius: 8px; color: #e2e8f0; text-decoration: none; font-size: 13px;
    font-weight: 600; transition: all 0.15s;
  }
  .notif-back:hover { border-color: #f97316; color: #f97316; }

  .notif-card {
    background: #0f1225; border: 1px solid #1a1f3a; border-radius: 12px;
    padding: 24px; margin-bottom: 24px;
  }

  .notif-card h2 {
    font-size: 18px; font-weight: 700; color: #e2e8f0; margin-bottom: 8px;
  }

  .notif-desc {
    font-size: 13px; color: #64748b; margin-bottom: 24px;
  }

  .notif-settings {
    display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;
  }

  .notif-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px; background: #161a32; border-radius: 8px;
    border: 1px solid #1a1f3a;
  }
  @media (max-width: 640px) {
    .notif-item { flex-direction: column; gap: 12px; align-items: flex-start; }
  }

  .notif-item-info { flex: 1; }
  .notif-item-title { font-size: 14px; font-weight: 700; color: #e2e8f0; margin-bottom: 4px; }
  .notif-item-desc { font-size: 12px; color: #64748b; }

  .notif-toggle {
    display: inline-flex; align-items: center; cursor: pointer;
    position: relative; width: 48px; height: 28px;
  }

  .notif-toggle input {
    display: none;
  }

  .notif-toggle-slider {
    position: absolute; cursor: pointer; top: 0; left: 0;
    right: 0; bottom: 0; background-color: #1a1f3a;
    transition: 0.3s; border-radius: 14px;
  }

  .notif-toggle-slider:before {
    position: absolute; content: "";
    height: 22px; width: 22px; left: 3px; bottom: 3px;
    background-color: #94a3b8; transition: 0.3s; border-radius: 50%;
  }

  .notif-toggle input:checked + .notif-toggle-slider {
    background-color: #f97316;
  }

  .notif-toggle input:checked + .notif-toggle-slider:before {
    transform: translateX(20px); background-color: #fff;
  }

  .notif-actions {
    display: flex; gap: 12px;
  }

  .notif-save-btn {
    padding: 12px 24px; background: #f97316; border: none;
    border-radius: 8px; color: #fff; font-size: 14px; font-weight: 700;
    cursor: pointer; transition: opacity 0.15s;
  }

  .notif-save-btn:hover { opacity: 0.9; }
  .notif-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .notif-info-card {
    background: #0f1225; border: 1px solid #1a1f3a; border-radius: 12px;
    padding: 24px;
  }

  .notif-info-card h3 {
    font-size: 16px; font-weight: 700; color: #e2e8f0; margin-bottom: 16px;
  }

  .notif-info-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }

  .notif-info-item {
    padding: 16px; background: #161a32; border-radius: 8px;
    border: 1px solid #1a1f3a; text-align: center;
  }

  .notif-info-icon { font-size: 32px; margin-bottom: 8px; }
  .notif-info-title { font-size: 13px; font-weight: 700; color: #e2e8f0; margin-bottom: 4px; }
  .notif-info-desc { font-size: 12px; color: #64748b; line-height: 1.4; }
`;
