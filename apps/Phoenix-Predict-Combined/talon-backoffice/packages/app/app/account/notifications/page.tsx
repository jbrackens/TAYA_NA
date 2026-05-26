"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/ToastProvider";
import { updatePreferences } from "../../lib/api/user-client";

const pageClass = "mx-auto max-w-[800px] px-4 py-6";
const headerClass =
  "mb-8 flex items-start justify-between max-[640px]:flex-col max-[640px]:gap-4";
const backClass =
  "rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-2.5 text-[13px] font-semibold text-[var(--t1)] no-underline transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)]";
const cardClass =
  "mb-6 rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-6";
const descClass = "mb-6 text-[13px] text-[var(--t2)]";
const itemClass =
  "flex items-center justify-between rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] p-4 max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-3";
const itemTitleClass = "mb-1 text-sm font-bold text-[var(--t1)]";
const itemDescClass = "text-xs text-[var(--t3)]";
const toggleClass = "relative inline-flex h-7 w-12 cursor-pointer items-center";
const toggleInputClass = "peer sr-only";
const toggleSliderClass =
  "absolute inset-0 cursor-pointer rounded-[14px] bg-[var(--border-2)] transition-all duration-300 before:absolute before:bottom-[3px] before:left-[3px] before:h-[22px] before:w-[22px] before:rounded-full before:bg-[var(--t3)] before:transition-all before:duration-300 peer-checked:bg-[var(--accent)] peer-checked:before:translate-x-5 peer-checked:before:bg-white";

export default function NotificationsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [prefs, setPrefs] = useState({
    notification_email: true,
    notification_sms: false,
    notification_push: true,
    marketing_email: false,
  });
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
      // LC-13: do NOT claim success. The backend does not persist these yet
      // (the write goes to an in-process map that is never read), so a
      // "Preferences saved" toast would be a false success / silent data
      // loss. Be honest until the persistence build lands.
      toast.info(
        "Not saved yet",
        "Notification preferences aren't stored yet — this feature is still being built. Your selections won't persist after you leave this page.",
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
    <div className={pageClass}>
      <div className={headerClass}>
        <div>
          <h1 className="mb-1 text-[28px] font-extrabold text-[var(--t1)]">
            Notification Preferences
          </h1>
          <p className="text-sm text-[var(--t3)]">
            Choose how you want to receive updates
          </p>
        </div>
        <Link href="/account" className={backClass}>
          ← Back
        </Link>
      </div>

      {/* Notification Settings Card */}
      <div className={cardClass}>
        <h2 className="mb-2 text-lg font-bold text-[var(--t1)]">
          Communication Channels
        </h2>
        <p className={descClass}>
          Select which channels you want to receive notifications on
        </p>

        <div
          className="mb-6 flex items-start gap-2.5 rounded-[var(--r-rh-md)] border border-l-[3px] border-[var(--border-1)] border-l-[var(--accent)] bg-[var(--surface-2)] px-[14px] py-3 text-[13px] leading-normal text-[var(--t2)]"
          role="status"
        >
          <span className="shrink-0" aria-hidden="true">
            ⚠️
          </span>
          <span>
            Heads up — notification preferences aren&apos;t saved yet.
            We&apos;re still building this, so your selections won&apos;t
            persist after you leave this page.
          </span>
        </div>

        <div className="mb-6 flex flex-col gap-4">
          {/* Email Notifications */}
          <div className={itemClass}>
            <div className="flex-1">
              <div className={itemTitleClass}>Email Notifications</div>
              <div className={itemDescClass}>
                Receive notifications about your account activity via email
              </div>
            </div>
            <label className={toggleClass}>
              <input
                className={toggleInputClass}
                type="checkbox"
                checked={prefs.notification_email}
                onChange={() => handleToggle("notification_email")}
              />
              <span className={toggleSliderClass}></span>
            </label>
          </div>

          {/* SMS Notifications */}
          <div className={itemClass}>
            <div className="flex-1">
              <div className={itemTitleClass}>SMS Notifications</div>
              <div className={itemDescClass}>
                Receive important alerts via text message
              </div>
            </div>
            <label className={toggleClass}>
              <input
                className={toggleInputClass}
                type="checkbox"
                checked={prefs.notification_sms}
                onChange={() => handleToggle("notification_sms")}
              />
              <span className={toggleSliderClass}></span>
            </label>
          </div>

          {/* Push Notifications */}
          <div className={itemClass}>
            <div className="flex-1">
              <div className={itemTitleClass}>Push Notifications</div>
              <div className={itemDescClass}>
                Get real-time notifications on your browser or mobile app
              </div>
            </div>
            <label className={toggleClass}>
              <input
                className={toggleInputClass}
                type="checkbox"
                checked={prefs.notification_push}
                onChange={() => handleToggle("notification_push")}
              />
              <span className={toggleSliderClass}></span>
            </label>
          </div>

          {/* Marketing Email */}
          <div className={itemClass}>
            <div className="flex-1">
              <div className={itemTitleClass}>Marketing Emails</div>
              <div className={itemDescClass}>
                Receive emails about new features, promotions, and special
                offers
              </div>
            </div>
            <label className={toggleClass}>
              <input
                className={toggleInputClass}
                type="checkbox"
                checked={prefs.marketing_email}
                onChange={() => handleToggle("marketing_email")}
              />
              <span className={toggleSliderClass}></span>
            </label>
          </div>
        </div>

        {/* Email Frequency */}
        <div className="mb-6">
          <h3 className="mb-3 text-[15px] font-bold text-[var(--t1)]">
            Email Frequency
          </h3>
          <div className="flex flex-col gap-2">
            {(
              [
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
              ] as const
            ).map((opt) => (
              <label key={opt.value} className={`${itemClass} cursor-pointer`}>
                <div className="flex-1">
                  <div className={itemTitleClass}>{opt.label}</div>
                  <div className={itemDescClass}>{opt.desc}</div>
                </div>
                <input
                  className="h-[18px] w-[18px] accent-[var(--accent)]"
                  type="radio"
                  name="emailFrequency"
                  value={opt.value}
                  checked={emailFrequency === opt.value}
                  onChange={() => setEmailFrequency(opt.value)}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Notification Categories */}
        <div className="mb-6">
          <h3 className="mb-3 text-[15px] font-bold text-[var(--t1)]">
            Notification Categories
          </h3>
          <div className="flex flex-col gap-2">
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
                desc: "Deposit confirmations, withdrawal status, and security alerts",
              },
              {
                key: "new_markets" as const,
                label: "New Markets",
                desc: "Be notified when new sports or leagues are added",
              },
              {
                key: "odds_alerts" as const,
                label: "Odds Alerts",
                desc: "Get alerted when odds change significantly on your favorites",
              },
            ].map((cat) => (
              <label key={cat.key} className={`${itemClass} cursor-pointer`}>
                <div className="flex-1">
                  <div className={itemTitleClass}>{cat.label}</div>
                  <div className={itemDescClass}>{cat.desc}</div>
                </div>
                <input
                  className="h-[18px] w-[18px] accent-[var(--accent)]"
                  type="checkbox"
                  checked={categories[cat.key]}
                  onChange={() => handleCategoryToggle(cat.key)}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            className="cursor-pointer rounded-[var(--r-rh-md)] border-0 bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white transition-all duration-150 hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSave}
            disabled={saveLoading}
          >
            {saveLoading ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>

      {/* Notification Types Info */}
      <div className={cardClass}>
        <h3 className="mb-4 text-base font-bold text-[var(--t1)]">
          What You'll Receive
        </h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <InfoItem
            icon="📢"
            title="Announcements"
            desc="Important updates about your account and our service"
          />
          <InfoItem
            icon="🎁"
            title="Promotions"
            desc="Special offers and bonus opportunities"
          />
          <InfoItem
            icon="📅"
            title="Subscription Updates"
            desc="Renewal reminders and billing notifications"
          />
          <InfoItem
            icon="🔐"
            title="Sign-in Notifications"
            desc="Alerts when your account is accessed"
          />
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] p-4 text-center">
      <div className="mb-2 text-[32px]">{icon}</div>
      <div className="mb-1 text-[13px] font-bold text-[var(--t1)]">{title}</div>
      <div className="text-xs leading-snug text-[var(--t3)]">{desc}</div>
    </div>
  );
}
