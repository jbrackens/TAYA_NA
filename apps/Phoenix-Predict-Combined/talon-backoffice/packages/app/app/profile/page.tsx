"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { getProfile, updateProfile } from "../lib/api/user-client";
import { UserProfile, UpdateProfileRequest } from "../lib/api/user-client";
import {
  setDepositLimits,
  setStakeLimits,
  getLimitsHistory,
} from "../lib/api/compliance-client";
import {
  SetDepositLimitsRequest,
  SetStakeLimitsRequest,
  LimitHistoryItem,
} from "../lib/api/compliance-client";
import { useToast } from "../components/ToastProvider";
import { useTranslation } from "react-i18next";
import { logger } from "../lib/logger";

type TabType = "settings" | "limits" | "verification" | "security";

const tabValues: TabType[] = ["settings", "limits", "verification", "security"];

function StatusBadge({
  status,
}: {
  status?: "verified" | "pending" | "failed";
}) {
  const statusColors: Record<string, { bg: string; color: string }> = {
    verified: { bg: "#1e7e34", color: "#22c55e" },
    pending: { bg: "#665700", color: "#fbbf24" },
    failed: { bg: "#7f1d1d", color: "var(--no)" },
    default: { bg: "#0f3460", color: "#4a7eff" },
  };

  const colors = status ? statusColors[status] : statusColors.default;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: "4px",
        fontSize: "12px",
        fontWeight: "600",
        backgroundColor: colors.bg,
        color: colors.color,
      }}
    >
      {status === "verified" && "Verified"}
      {status === "pending" && "Pending"}
      {status === "failed" && "Failed"}
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
  const tabs = ["Settings", "Limits", "Verification", "Security"];

  return (
    <div
      style={{
        display: "flex",
        borderBottom: "1px solid var(--border-1)",
        marginBottom: "24px",
      }}
    >
      {tabs.map((label, index) => (
        <button
          key={index}
          onClick={() => onChange(index)}
          style={{
            padding: "12px 16px",
            border: "none",
            backgroundColor: "transparent",
            color: activeTabIndex === index ? "var(--accent)" : "var(--t2)",
            borderBottom:
              activeTabIndex === index ? "2px solid var(--accent)" : "none",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  backgroundColor: "var(--surface-2)",
  border: "1px solid var(--border-1)",
  borderRadius: "var(--r-rh-md)",
  color: "var(--t1)",
  fontSize: "14px",
  boxSizing: "border-box" as const,
  outline: "none" as const,
};

const labelStyle = {
  display: "block",
  fontSize: "14px",
  fontWeight: "600" as const,
  marginBottom: "8px",
  color: "var(--t1)",
};

const btnStyle = {
  padding: "10px 20px",
  backgroundColor: "var(--accent)",
  color: "#04140a",
  border: "none",
  borderRadius: "var(--r-rh-md)",
  fontSize: "14px",
  fontWeight: "600" as const,
  cursor: "pointer",
};

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
];

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

const ODDS_FORMATS = ["Decimal", "American", "Fractional"] as const;

export default function ProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const { i18n } = useTranslation();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const activeTab = tabValues[activeTabIndex];

  // Preferences state
  const [prefLanguage, setPrefLanguage] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("phoenix_language") || "en";
    }
    return "en";
  });
  const [prefTimezone, setPrefTimezone] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("phoenix_timezone") || "UTC";
    }
    return "UTC";
  });
  const [prefOddsFormat, setPrefOddsFormat] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("phoenix_odds_format") || "Decimal";
    }
    return "Decimal";
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
  const [maxStake, setMaxStake] = useState("");
  const [savingLimits, setSavingLimits] = useState(false);

  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
        const depositReq: SetDepositLimitsRequest = {
          user_id: user.id,
          daily_limit: dailyLimit ? Number(dailyLimit) : undefined,
          weekly_limit: weeklyLimit ? Number(weeklyLimit) : undefined,
          monthly_limit: monthlyLimit ? Number(monthlyLimit) : undefined,
        };
        await setDepositLimits(depositReq);
      }
      if (maxStake) {
        const stakeReq: SetStakeLimitsRequest = {
          user_id: user.id,
          max_stake: Number(maxStake),
        };
        await setStakeLimits(stakeReq);
      }
      toast.success(
        "Limits Updated",
        "Your responsible gaming limits have been saved.",
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update limits";
      toast.error("Update Failed", msg);
    } finally {
      setSavingLimits(false);
    }
  }, [user?.id, dailyLimit, weeklyLimit, monthlyLimit, maxStake, toast]);

  // Save preferences
  const handleSavePreferences = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("phoenix_language", prefLanguage);
        localStorage.setItem("phoenix_timezone", prefTimezone);
        localStorage.setItem("phoenix_odds_format", prefOddsFormat);
      }
      i18n.changeLanguage(prefLanguage);
      logger.info("Profile", "Preferences saved", {
        prefLanguage,
        prefTimezone,
        prefOddsFormat,
      });
      toast.success("Preferences Saved", "Your preferences have been updated.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Save Failed", msg);
    }
  }, [prefLanguage, prefTimezone, prefOddsFormat, i18n, toast]);

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

  if (profileLoading) {
    return (
      <div style={{ maxWidth: "800px", padding: "40px", color: "var(--t3)" }}>
        Loading profile...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px" }}>
      <h1
        style={{
          fontSize: "28px",
          fontWeight: "700",
          marginBottom: "24px",
          color: "var(--t1)",
        }}
      >
        My Account
      </h1>

      <div
        style={{
          padding: "24px",
          marginBottom: "24px",
          backgroundColor: "var(--surface-1)",
          borderRadius: "var(--r-rh-lg)",
          border: "1px solid var(--border-1)",
        }}
      >
        <TabNavigation
          activeTabIndex={activeTabIndex}
          onChange={setActiveTabIndex}
        />

        {activeTab === "settings" && (
          <>
            <div style={{ marginBottom: "24px" }}>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  color: "var(--t1)",
                }}
              >
                Personal Information
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div>
                  <label style={labelStyle}>First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                value={email}
                disabled
                style={{ ...inputStyle, opacity: "0.6" }}
              />
              <p
                style={{ fontSize: "12px", color: "var(--t3)", marginTop: "8px" }}
              >
                Email cannot be changed. Contact support if you need to update
                it.
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                style={{ ...btnStyle, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            {/* Preferences Section */}
            <div style={{ borderTop: "1px solid var(--border-1)", paddingTop: "24px" }}>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  color: "var(--t1)",
                }}
              >
                Preferences
              </h2>

              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Language</label>
                <select
                  value={prefLanguage}
                  onChange={(e) => setPrefLanguage(e.target.value)}
                  style={inputStyle}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Timezone</label>
                <select
                  value={prefTimezone}
                  onChange={(e) => setPrefTimezone(e.target.value)}
                  style={inputStyle}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Odds Format</label>
                <div style={{ display: "flex", gap: "16px" }}>
                  {ODDS_FORMATS.map((fmt) => (
                    <label
                      key={fmt}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "var(--t1)",
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="oddsFormat"
                        value={fmt}
                        checked={prefOddsFormat === fmt}
                        onChange={(e) => setPrefOddsFormat(e.target.value)}
                      />
                      {fmt}
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={handleSavePreferences} style={btnStyle}>
                Save Preferences
              </button>
            </div>
          </>
        )}

        {activeTab === "limits" && (
          <>
            <div style={{ marginBottom: "24px" }}>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  color: "var(--t1)",
                }}
              >
                Deposit Limits
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div>
                  <label style={labelStyle}>Daily Limit ($)</label>
                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    placeholder="1000"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Weekly Limit ($)</label>
                  <input
                    type="number"
                    value={weeklyLimit}
                    onChange={(e) => setWeeklyLimit(e.target.value)}
                    placeholder="5000"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Monthly Limit ($)</label>
                  <input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value)}
                    placeholder="10000"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  color: "var(--t1)",
                }}
              >
                Betting Limits
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div>
                  <label style={labelStyle}>Max Bet Amount ($)</label>
                  <input
                    type="number"
                    value={maxStake}
                    onChange={(e) => setMaxStake(e.target.value)}
                    placeholder="500"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                onClick={handleSaveLimits}
                disabled={savingLimits}
                style={{ ...btnStyle, opacity: savingLimits ? 0.6 : 1 }}
              >
                {savingLimits ? "Saving..." : "Update Limits"}
              </button>
            </div>
          </>
        )}

        {activeTab === "verification" && (
          <>
            <div style={{ marginBottom: "24px" }}>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  color: "var(--t1)",
                }}
              >
                Verification Status
              </h2>
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom: "1px solid var(--border-1)",
                  }}
                >
                  <span style={{ color: "var(--t3)", fontSize: "14px" }}>
                    Email Verification
                  </span>
                  <StatusBadge status="verified" />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom: "1px solid var(--border-1)",
                  }}
                >
                  <span style={{ color: "var(--t3)", fontSize: "14px" }}>
                    Phone Verification
                  </span>
                  <StatusBadge
                    status={profile?.phone ? "verified" : "pending"}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom: "1px solid var(--border-1)",
                  }}
                >
                  <span style={{ color: "var(--t3)", fontSize: "14px" }}>
                    Identity Verification (KYC)
                  </span>
                  <StatusBadge
                    status={
                      profile?.kycStatus === "approved"
                        ? "verified"
                        : profile?.kycStatus === "pending"
                          ? "pending"
                          : "failed"
                    }
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  color: "var(--t1)",
                }}
              >
                Complete Verification
              </h2>
              <p
                style={{
                  color: "var(--t3)",
                  fontSize: "14px",
                  marginBottom: "16px",
                }}
              >
                Verify your identity to unlock higher limits and improved
                features.
              </p>
              <button style={btnStyle}>Start Verification</button>
            </div>
          </>
        )}

        {activeTab === "security" && (
          <>
            <div style={{ marginBottom: "24px" }}>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  color: "var(--t1)",
                }}
              >
                Password
              </h2>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  style={inputStyle}
                />
              </div>
              <button onClick={handleChangePassword} style={btnStyle}>
                Change Password
              </button>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  color: "var(--t1)",
                }}
              >
                Two-Factor Authentication
              </h2>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 0",
                  borderBottom: "1px solid var(--border-1)",
                }}
              >
                <span style={{ color: "var(--t3)", fontSize: "14px" }}>
                  Enable 2FA for added security
                </span>
                <input
                  type="checkbox"
                  style={{ width: "50px", height: "24px", cursor: "pointer" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  color: "var(--t1)",
                }}
              >
                Account Info
              </h2>
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom: "1px solid var(--border-1)",
                  }}
                >
                  <span style={{ color: "var(--t3)", fontSize: "14px" }}>
                    Username
                  </span>
                  <span style={{ color: "var(--t1)", fontWeight: "600" }}>
                    {profile?.username || user?.username}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom: "1px solid var(--border-1)",
                  }}
                >
                  <span style={{ color: "var(--t3)", fontSize: "14px" }}>
                    Member Since
                  </span>
                  <span style={{ color: "var(--t1)", fontWeight: "600" }}>
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
