"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { getProfile, updateProfile } from "../lib/api/user-client";
import { UserProfile, UpdateProfileRequest } from "../lib/api/user-client";
import {
  setPredictionLimits,
  setPointUseLimits,
  verifyIdentity,
} from "../lib/api/compliance-client";
import {
  SetPredictionLimitsRequest,
  SetPointUseLimitsRequest,
} from "../lib/api/compliance-client";
import { useToast } from "../components/ToastProvider";
import { useTranslation } from "react-i18next";
import { logger } from "../lib/logger";
import { FEATURE_KYC, FEATURE_LIMITS } from "../lib/features";
import {
  legacyLocaleStorageKey,
  localeStorageKey,
  normalizeLocale,
  supportedLocales,
} from "../lib/i18n/locales";

type TabType = "settings" | "limits" | "verification" | "security";

const tabValues: TabType[] = (
  ["settings", "limits", "verification", "security"] as TabType[]
).filter((v) => FEATURE_LIMITS || v !== "limits");

const statusBadgeClasses: Record<string, string> = {
  verified:
    "inline-block rounded-[4px] bg-[#1e7e34] px-3 py-1 text-[12px] font-semibold text-[#22c55e]",
  pending:
    "inline-block rounded-[4px] bg-[#665700] px-3 py-1 text-[12px] font-semibold text-[#fbbf24]",
  failed:
    "inline-block rounded-[4px] bg-[#7f1d1d] px-3 py-1 text-[12px] font-semibold text-[var(--no)]",
  unverified:
    "inline-block rounded-[4px] bg-[#3a3a3a] px-3 py-1 text-[12px] font-semibold text-[var(--t3)]",
  default:
    "inline-block rounded-[4px] bg-[#0f3460] px-3 py-1 text-[12px] font-semibold text-[#4a7eff]",
};

const tabListClass = "mb-6 flex border-b border-[var(--border-1)]";
const tabButtonClass = (active: boolean) =>
  active
    ? "cursor-pointer border-0 border-b-2 border-b-[var(--accent)] bg-transparent px-4 py-3 text-[14px] font-medium text-[var(--accent)]"
    : "cursor-pointer border-0 bg-transparent px-4 py-3 text-[14px] font-medium text-[var(--t2)]";

const inputClass =
  "box-border w-full rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-2 text-[14px] text-[var(--t1)]";
const labelClass = "mb-2 block text-[14px] font-semibold text-[var(--t1)]";
const buttonClass =
  "cursor-pointer rounded-[var(--r-rh-md)] border-0 bg-[var(--accent)] px-5 py-2.5 text-[14px] font-semibold text-[#04140a] disabled:cursor-not-allowed disabled:opacity-60";
const loadingClass = "max-w-[800px] p-10 text-[var(--t3)]";
const pageClass = "max-w-[800px]";
const pageTitleClass = "mb-6 text-[28px] font-bold text-[var(--t1)]";
const cardClass =
  "mb-6 rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-6";
const sectionClass = "mb-6";
const sectionTitleClass = "mb-4 text-[16px] font-semibold text-[var(--t1)]";
const twoColumnGridClass = "grid grid-cols-2 gap-4";
const hintClass = "mt-2 text-[12px] text-[var(--t3)]";
const preferenceSectionClass = "border-t border-[var(--border-1)] pt-6";
const fieldClass = "mb-4";
const verificationRowClass =
  "flex justify-between border-b border-[var(--border-1)] py-3";
const mutedTextClass = "text-[14px] text-[var(--t3)]";
const securityRowClass =
  "flex items-center justify-between border-b border-[var(--border-1)] py-4";
const accountValueClass = "font-semibold text-[var(--t1)]";
const checkboxSwitchClass = "h-6 w-[50px] cursor-pointer";

function StatusBadge({
  status,
}: {
  status?: "verified" | "pending" | "failed" | "unverified";
}) {
  return (
    <span className={statusBadgeClasses[status ?? "default"]}>
      {status === "verified" && "Verified"}
      {status === "pending" && "Pending"}
      {status === "failed" && "Failed"}
      {status === "unverified" && "Not Verified"}
    </span>
  );
}

function TabNavigation({
  activeTabIndex,
  onChange,
}: {
  activeTabIndex: number;
  onChange: (index: number) => void;
}) {
  const tabs = ["Settings", "Limits", "Verification", "Security"].filter(
    (label) => FEATURE_LIMITS || label !== "Limits",
  );

  return (
    <div className={tabListClass}>
      {tabs.map((label, index) => (
        <button
          key={index}
          onClick={() => onChange(index)}
          className={tabButtonClass(activeTabIndex === index)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
  "America/Sao_Paulo",
  "Africa/Johannesburg",
];

// Prediction markets price in cents (0–99 = implied probability), so an
// "odds format" preference (Decimal/American/Fractional) does not apply.
// This radio group + the phoenix_odds_format localStorage key are
// sportsbook leftovers from the fork and were removed on 2026-05-03.

export default function ProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const { i18n } = useTranslation();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const activeTab = tabValues[activeTabIndex];

  // Preferences state
  const [prefLanguage, setPrefLanguage] = useState(() => {
    if (typeof window !== "undefined") {
      return normalizeLocale(
        localStorage.getItem(localeStorageKey) ||
          localStorage.getItem(legacyLocaleStorageKey),
      );
    }
    return "en";
  });
  const [prefTimezone, setPrefTimezone] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("phoenix_timezone") || "UTC";
    }
    return "UTC";
  });
  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [saving, setSaving] = useState(false);

  // Limits state
  const [dailyLimit, setDailyLimit] = useState("");
  const [weeklyLimit, setWeeklyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [maxOrderPoints, setMaxOrderPoints] = useState("");
  const [savingLimits, setSavingLimits] = useState(false);

  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // KYC verification (LC-22 / D-8)
  const [verifying, setVerifying] = useState(false);

  // Load profile on mount
  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const p = await getProfile(user.id);
        if (!cancelled) {
          setProfile(p);
          setFirstName(p.firstName || "");
          setLastName(p.lastName || "");
          setEmail(p.email || "");
          setPhone(p.phone || "");
          setDateOfBirth(p.dateOfBirth || "");
        }
      } catch (err) {
        if (!cancelled) {
          toast.error("Load Failed", "Could not load profile data.");
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Save profile
  const handleSaveProfile = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const request: UpdateProfileRequest = {
        first_name: firstName,
        last_name: lastName,
        phone: phone || undefined,
        date_of_birth: dateOfBirth || undefined,
      };
      const updated = await updateProfile(user.id, request);
      setProfile(updated);
      toast.success("Profile Updated", "Your changes have been saved.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save profile";
      toast.error("Save Failed", msg);
    } finally {
      setSaving(false);
    }
  }, [user?.id, firstName, lastName, phone, dateOfBirth, toast]);

  // Save limits
  const handleSaveLimits = useCallback(async () => {
    if (!user?.id) return;
    setSavingLimits(true);
    try {
      if (dailyLimit || weeklyLimit || monthlyLimit) {
        const pointUseReq: SetPointUseLimitsRequest = {
          user_id: user.id,
          dailyLimitPoints: dailyLimit ? Number(dailyLimit) : undefined,
          weeklyLimitPoints: weeklyLimit ? Number(weeklyLimit) : undefined,
          monthlyLimitPoints: monthlyLimit ? Number(monthlyLimit) : undefined,
        };
        await setPointUseLimits(pointUseReq);
      }
      if (maxOrderPoints) {
        const predictionReq: SetPredictionLimitsRequest = {
          user_id: user.id,
          maxOrderPoints: Number(maxOrderPoints),
        };
        await setPredictionLimits(predictionReq);
      }
      toast.success(
        "Limits Updated",
        "Your responsible-play limits have been saved.",
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update limits";
      toast.error("Update Failed", msg);
    } finally {
      setSavingLimits(false);
    }
  }, [user?.id, dailyLimit, weeklyLimit, monthlyLimit, maxOrderPoints, toast]);

  // Save preferences
  const handleSavePreferences = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(localeStorageKey, prefLanguage);
        localStorage.setItem(legacyLocaleStorageKey, prefLanguage);
        localStorage.setItem("phoenix_timezone", prefTimezone);
        document.cookie = `${localeStorageKey}=${encodeURIComponent(prefLanguage)}; Max-Age=31536000; Path=/; SameSite=Lax`;
      }
      i18n.changeLanguage(prefLanguage);
      logger.info("Profile", "Preferences saved", {
        prefLanguage,
        prefTimezone,
      });
      toast.success("Preferences Saved", "Your preferences have been updated.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Save Failed", msg);
    }
  }, [prefLanguage, prefTimezone, i18n, toast]);

  // Change password
  const handleChangePassword = useCallback(async () => {
    if (newPassword !== confirmPassword) {
      toast.error(
        "Password Mismatch",
        "New password and confirmation do not match.",
      );
      return;
    }
    if (!currentPassword || !newPassword) {
      toast.error("Missing Fields", "Please fill in all password fields.");
      return;
    }
    try {
      const response = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error?.message || "Failed to change password");
      }
      toast.success(
        "Password Changed",
        "Your password has been updated successfully.",
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to change password";
      toast.error("Error", message);
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, [currentPassword, newPassword, confirmPassword, toast]);

  // Start KYC verification (LC-22 / D-8): submit identity for verification,
  // then refresh the profile so the badge reflects the new real status.
  const handleStartVerification = useCallback(async () => {
    if (!user?.id) return;
    setVerifying(true);
    try {
      const { status } = await verifyIdentity(user.id);
      try {
        const p = await getProfile(user.id);
        setProfile(p);
      } catch (refreshErr: unknown) {
        logger.error(
          "Profile",
          "KYC status refresh after verification failed",
          refreshErr instanceof Error ? refreshErr.message : String(refreshErr),
        );
      }
      if (status === "approved") {
        toast.success("Identity Verified", "Your identity has been verified.");
      } else {
        toast.success(
          "Verification Submitted",
          "Your identity verification is being processed.",
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Profile", "KYC verification failed", message);
      toast.error(
        "Verification Failed",
        "Could not start identity verification.",
      );
    } finally {
      setVerifying(false);
    }
  }, [user?.id, toast]);

  if (profileLoading) {
    return <div className={loadingClass}>Loading profile...</div>;
  }

  return (
    <div className={pageClass}>
      <h1 className={pageTitleClass}>My Account</h1>

      <div className={cardClass}>
        <TabNavigation
          activeTabIndex={activeTabIndex}
          onChange={setActiveTabIndex}
        />

        {activeTab === "settings" && (
          <>
            <div className={sectionClass}>
              <h2 className={sectionTitleClass}>Personal Information</h2>
              <div className={twoColumnGridClass}>
                <div>
                  <label className={labelClass}>First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <label className={labelClass}>Email Address</label>
              <input
                type="email"
                value={email}
                disabled
                className={`${inputClass} opacity-60`}
              />
              <p className={hintClass}>
                Email cannot be changed. Contact support if you need to update
                it.
              </p>
            </div>

            <div className={sectionClass}>
              <label className={labelClass}>Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className={inputClass}
              />
            </div>

            <div className={sectionClass}>
              <label className={labelClass}>Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className={sectionClass}>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className={buttonClass}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            {/* Preferences Section */}
            <div className={preferenceSectionClass}>
              <h2 className={sectionTitleClass}>Preferences</h2>

              <div className={fieldClass}>
                <label className={labelClass}>Language</label>
                <select
                  value={prefLanguage}
                  onChange={(e) =>
                    setPrefLanguage(normalizeLocale(e.target.value))
                  }
                  className={inputClass}
                >
                  {supportedLocales.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={fieldClass}>
                <label className={labelClass}>Timezone</label>
                <select
                  value={prefTimezone}
                  onChange={(e) => setPrefTimezone(e.target.value)}
                  className={inputClass}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <button onClick={handleSavePreferences} className={buttonClass}>
                Save Preferences
              </button>
            </div>
          </>
        )}

        {activeTab === "limits" && (
          <>
            <div className={sectionClass}>
              <h2 className={sectionTitleClass}>Point-Use Limits</h2>
              <div className={twoColumnGridClass}>
                <div>
                  <label className={labelClass}>Daily Limit (pts)</label>
                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    placeholder="1000"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Weekly Limit (pts)</label>
                  <input
                    type="number"
                    value={weeklyLimit}
                    onChange={(e) => setWeeklyLimit(e.target.value)}
                    placeholder="5000"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Monthly Limit (pts)</label>
                  <input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value)}
                    placeholder="10000"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <h2 className={sectionTitleClass}>Prediction Limits</h2>
              <div className={twoColumnGridClass}>
                <div>
                  <label className={labelClass}>Max Order Size (pts)</label>
                  <input
                    type="number"
                    value={maxOrderPoints}
                    onChange={(e) => setMaxOrderPoints(e.target.value)}
                    placeholder="500"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                onClick={handleSaveLimits}
                disabled={savingLimits}
                className={buttonClass}
              >
                {savingLimits ? "Saving..." : "Update Limits"}
              </button>
            </div>
          </>
        )}

        {activeTab === "verification" && (
          <>
            <div className={sectionClass}>
              <h2 className={sectionTitleClass}>Verification Status</h2>
              <div>
                <div className={verificationRowClass}>
                  <span className={mutedTextClass}>Email Verification</span>
                  <StatusBadge status="verified" />
                </div>
                <div className={verificationRowClass}>
                  <span className={mutedTextClass}>Phone Verification</span>
                  <StatusBadge
                    status={profile?.phone ? "verified" : "pending"}
                  />
                </div>
                {FEATURE_KYC && (
                  <div className={verificationRowClass}>
                    <span className={mutedTextClass}>
                      Identity Verification (KYC)
                    </span>
                    <StatusBadge
                      status={
                        profile?.kycStatus === "approved"
                          ? "verified"
                          : profile?.kycStatus === "pending"
                            ? "pending"
                            : profile?.kycStatus === "declined" ||
                                profile?.kycStatus === "blocked"
                              ? "failed"
                              : "unverified"
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            {FEATURE_KYC && (
              <div className={sectionClass}>
                <h2 className={sectionTitleClass}>Complete Verification</h2>
                <p className="mb-4 text-[14px] text-[var(--t3)]">
                  Verify your identity to unlock higher limits and improved
                  features.
                </p>
                <button
                  className={buttonClass}
                  onClick={handleStartVerification}
                  disabled={verifying}
                >
                  {verifying ? "Verifying…" : "Start Verification"}
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === "security" && (
          <>
            <div className={sectionClass}>
              <h2 className={sectionTitleClass}>Password</h2>
              <div className={fieldClass}>
                <label className={labelClass}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className={inputClass}
                />
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className={inputClass}
                />
              </div>
              <div className={fieldClass}>
                <label className={labelClass}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={inputClass}
                />
              </div>
              <button onClick={handleChangePassword} className={buttonClass}>
                Change Password
              </button>
            </div>

            <div className={sectionClass}>
              <h2 className={sectionTitleClass}>Two-Factor Authentication</h2>
              <div className={securityRowClass}>
                <span className={mutedTextClass}>
                  Enable 2FA for added security
                </span>
                <input type="checkbox" className={checkboxSwitchClass} />
              </div>
            </div>

            <div className={sectionClass}>
              <h2 className={sectionTitleClass}>Account Info</h2>
              <div>
                <div className={verificationRowClass}>
                  <span className={mutedTextClass}>Username</span>
                  <span className={accountValueClass}>
                    {profile?.username || user?.username}
                  </span>
                </div>
                <div className={verificationRowClass}>
                  <span className={mutedTextClass}>Member Since</span>
                  <span className={accountValueClass}>
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
