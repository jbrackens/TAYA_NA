"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/ToastProvider";
import {
  changePassword,
  getSessions,
  revokeSession,
} from "../../lib/api/auth-client";
import type { Session } from "../../lib/api/auth-client";
import { logger } from "../../lib/logger";

const pageClass = "mx-auto max-w-[800px] px-4 py-6";
const headerClass =
  "mb-8 flex items-start justify-between max-[640px]:flex-col max-[640px]:gap-4";
const backClass =
  "rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-2.5 text-[13px] font-semibold text-[var(--t1)] no-underline transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)]";
const cardClass =
  "rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-6";
const descClass = "mb-6 text-[13px] text-[var(--t2)]";
const labelClass = "text-[13px] font-semibold text-[var(--t2)]";
const inputClass =
  "rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--t1)] outline-none transition-colors duration-150 focus:border-[var(--accent)]";

function tabClass(active: boolean) {
  return `cursor-pointer border-0 border-b-2 bg-transparent px-4 py-3 text-sm font-semibold transition-all duration-150 ${
    active
      ? "border-[var(--accent)] text-[var(--accent)]"
      : "border-transparent text-[var(--t2)]"
  }`;
}

function twoFaButtonClass(enabled: boolean) {
  return `cursor-pointer rounded-lg px-4 py-2.5 text-[13px] font-bold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
    enabled
      ? "border border-[var(--border-1)] bg-[var(--surface-2)] text-[var(--t1)] hover:bg-[var(--border-1)]"
      : "border-0 bg-[var(--accent)] text-[#04140a] hover:opacity-90"
  }`;
}

export default function SecurityPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState<"password" | "twofa" | "sessions">("password");

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // 2FA state
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  // Sessions list
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Load sessions from API
  useEffect(() => {
    if (!user?.id) return;
    const loadSessions = async () => {
      setSessionsLoading(true);
      try {
        const data = await getSessions(user.id);
        setSessions(data);
      } catch (err) {
        logger.error(
          "Security",
          "Failed to load sessions",
          err instanceof Error ? err.message : String(err),
        );
      } finally {
        setSessionsLoading(false);
      }
    };
    loadSessions();
  }, [user?.id]);

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Session revoked", "The session has been signed out");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Failed to revoke session", message);
    } finally {
      setRevokingId(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 12) {
      setPasswordError("Password must be at least 12 characters");
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword({
        user_id: user?.id || "",
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success(
        "Password changed",
        "Your password has been updated successfully",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const msg = message || "Failed to change password";
      setPasswordError(msg);
      toast.error("Password change failed", msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    setTwoFaLoading(true);
    try {
      const response = await fetch("/api/v1/auth/2fa/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled: !twoFaEnabled }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error?.message || "Failed to update 2FA setting");
      }
      setTwoFaEnabled(!twoFaEnabled);
      toast.success(`2FA ${!twoFaEnabled ? "enabled" : "disabled"}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update 2FA";
      toast.error(message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  return (
    <div className={pageClass}>
      <div className={headerClass}>
        <div>
          <h1 className="mb-1 text-[28px] font-extrabold text-[var(--t1)]">
            Security Settings
          </h1>
          <p className="text-sm text-[var(--t3)]">
            Manage your password, authentication, and active sessions
          </p>
        </div>
        <Link href="/account" className={backClass}>
          ← Back
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-0 border-b border-[var(--border-1)]">
        <button
          type="button"
          className={tabClass(tab === "password")}
          onClick={() => setTab("password")}
        >
          Password
        </button>
        <button
          type="button"
          className={tabClass(tab === "twofa")}
          onClick={() => setTab("twofa")}
        >
          Two-Factor Auth
        </button>
        <button
          type="button"
          className={tabClass(tab === "sessions")}
          onClick={() => setTab("sessions")}
        >
          Active Sessions
        </button>
      </div>

      {/* Password Tab */}
      {tab === "password" && (
        <div className={cardClass}>
          <h2 className="mb-2 text-lg font-bold text-[var(--t1)]">
            Change Password
          </h2>
          <p className={descClass}>
            Update your password to keep your account secure
          </p>

          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Current Password</label>
              <input
                type="password"
                className={inputClass}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>New Password</label>
              <input
                type="password"
                className={inputClass}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 12 chars)"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Confirm Password</label>
              <input
                type="password"
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            {passwordError && (
              <div className="rounded-lg border border-[rgba(255,155,107,0.2)] bg-[rgba(255,155,107,0.08)] px-3 py-2.5 text-[13px] font-medium text-[var(--no-text)]">
                {passwordError}
              </div>
            )}

            <button
              type="submit"
              className="cursor-pointer rounded-lg border-0 bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={passwordLoading}
            >
              {passwordLoading ? "Updating..." : "Change Password"}
            </button>
          </form>
        </div>
      )}

      {/* 2FA Tab */}
      {tab === "twofa" && (
        <div className={cardClass}>
          <h2 className="mb-2 text-lg font-bold text-[var(--t1)]">
            Two-Factor Authentication
          </h2>
          <p className={descClass}>
            Add an extra layer of security to your account
          </p>

          <div className="flex items-center justify-between rounded-[var(--r-rh-md)] bg-[var(--surface-2)] p-4 max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-4">
            <div className="flex flex-1 items-start gap-4">
              <div className="shrink-0 text-[32px]">🔐</div>
              <div>
                <div className="mb-1 text-[15px] font-bold text-[var(--t1)]">
                  {twoFaEnabled ? "2FA Enabled" : "2FA Disabled"}
                </div>
                <div className="text-[13px] text-[var(--t3)]">
                  {twoFaEnabled
                    ? "Your account is protected with two-factor authentication"
                    : "Enable 2FA to add extra security via authenticator app"}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggle2FA}
              disabled={twoFaLoading}
              className={twoFaButtonClass(twoFaEnabled)}
            >
              {twoFaLoading
                ? "Updating..."
                : twoFaEnabled
                  ? "Disable 2FA"
                  : "Enable 2FA"}
            </button>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {tab === "sessions" && (
        <div className={cardClass}>
          <h2 className="mb-2 text-lg font-bold text-[var(--t1)]">
            Active Sessions
          </h2>
          <p className={descClass}>
            View and manage devices logged into your account
          </p>

          <div className="flex flex-col gap-3">
            {sessionsLoading && (
              <div className="p-6 text-center text-[var(--t3)]">
                Loading sessions...
              </div>
            )}
            {!sessionsLoading && sessions.length === 0 && (
              <div className="p-6 text-center text-[var(--t3)]">
                No active sessions found.
              </div>
            )}
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] p-4 max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-3"
              >
                <div className="flex-1">
                  <div className="mb-1 text-sm font-semibold text-[var(--t1)]">
                    {session.device}
                  </div>
                  <div className="mb-1 text-xs text-[var(--t3)]">
                    {session.location}
                  </div>
                  <div className="text-xs text-[var(--t3)]">
                    Last active: {new Date(session.lastActive).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session.current && (
                    <span className="inline-block rounded bg-[rgba(43,228,128,0.1)] px-2 py-1 text-xs font-semibold text-[var(--accent)]">
                      Current
                    </span>
                  )}
                  {!session.current && (
                    <button
                      type="button"
                      className="cursor-pointer rounded-md border-0 bg-[var(--no)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={revokingId === session.id}
                    >
                      {revokingId === session.id ? "Revoking..." : "Sign Out"}
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="mt-3 rounded-[var(--r-rh-md)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--t3)]">
              ℹ️ Showing all active sessions. You can sign out of other devices
              above.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
