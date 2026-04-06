"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/ToastProvider";
import {
  changePassword,
  getSessions,
  revokeSession,
} from "../../lib/api/auth-client";
import { ChangePasswordRequest, Session } from "../../lib/api/auth-client";
import { logger } from "../../lib/logger";

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

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
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
      // API call would go here - for now just toggle UI
      await new Promise((r) => setTimeout(r, 500));
      setTwoFaEnabled(!twoFaEnabled);
      toast.success("2FA " + (!twoFaEnabled ? "enabled" : "disabled"));
    } catch (err) {
      toast.error("Failed to update 2FA");
    } finally {
      setTwoFaLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: securityStyles }} />
      <div className="sec-page">
        <div className="sec-header">
          <div>
            <h1>Security Settings</h1>
            <p>Manage your password, authentication, and active sessions</p>
          </div>
          <Link href="/account" className="sec-back">
            ← Back
          </Link>
        </div>

        {/* Tabs */}
        <div className="sec-tabs">
          <button
            className={`sec-tab ${tab === "password" ? "active" : ""}`}
            onClick={() => setTab("password")}
          >
            Password
          </button>
          <button
            className={`sec-tab ${tab === "twofa" ? "active" : ""}`}
            onClick={() => setTab("twofa")}
          >
            Two-Factor Auth
          </button>
          <button
            className={`sec-tab ${tab === "sessions" ? "active" : ""}`}
            onClick={() => setTab("sessions")}
          >
            Active Sessions
          </button>
        </div>

        {/* Password Tab */}
        {tab === "password" && (
          <div className="sec-card">
            <h2>Change Password</h2>
            <p className="sec-desc">
              Update your password to keep your account secure
            </p>

            <form onSubmit={handleChangePassword} className="sec-form">
              <div className="sec-field">
                <label className="sec-label">Current Password</label>
                <input
                  type="password"
                  className="sec-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <div className="sec-field">
                <label className="sec-label">New Password</label>
                <input
                  type="password"
                  className="sec-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 chars)"
                />
              </div>

              <div className="sec-field">
                <label className="sec-label">Confirm Password</label>
                <input
                  type="password"
                  className="sec-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              {passwordError && (
                <div className="sec-error">{passwordError}</div>
              )}

              <button
                type="submit"
                className="sec-submit"
                disabled={passwordLoading}
              >
                {passwordLoading ? "Updating..." : "Change Password"}
              </button>
            </form>
          </div>
        )}

        {/* 2FA Tab */}
        {tab === "twofa" && (
          <div className="sec-card">
            <h2>Two-Factor Authentication</h2>
            <p className="sec-desc">
              Add an extra layer of security to your account
            </p>

            <div className="sec-twofa">
              <div className="sec-twofa-info">
                <div className="sec-twofa-icon">🔐</div>
                <div>
                  <div className="sec-twofa-title">
                    {twoFaEnabled ? "2FA Enabled" : "2FA Disabled"}
                  </div>
                  <div className="sec-twofa-desc">
                    {twoFaEnabled
                      ? "Your account is protected with two-factor authentication"
                      : "Enable 2FA to add extra security via authenticator app"}
                  </div>
                </div>
              </div>

              <button
                onClick={handleToggle2FA}
                disabled={twoFaLoading}
                className={`sec-twofa-btn ${
                  twoFaEnabled ? "disable" : "enable"
                }`}
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
          <div className="sec-card">
            <h2>Active Sessions</h2>
            <p className="sec-desc">
              View and manage devices logged into your account
            </p>

            <div className="sec-sessions">
              {sessionsLoading && (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  Loading sessions...
                </div>
              )}
              {!sessionsLoading && sessions.length === 0 && (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  No active sessions found.
                </div>
              )}
              {sessions.map((session) => (
                <div key={session.id} className="sec-session-item">
                  <div className="sec-session-info">
                    <div className="sec-session-device">{session.device}</div>
                    <div className="sec-session-location">
                      {session.location}
                    </div>
                    <div className="sec-session-time">
                      Last active:{" "}
                      {new Date(session.lastActive).toLocaleString()}
                    </div>
                  </div>
                  <div className="sec-session-actions">
                    {session.current && (
                      <span className="sec-session-badge">Current</span>
                    )}
                    {!session.current && (
                      <button
                        className="sec-session-logout"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingId === session.id}
                      >
                        {revokingId === session.id ? "Revoking..." : "Sign Out"}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div className="sec-session-note">
                ℹ️ Showing all active sessions. You can sign out of other
                devices above.
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const securityStyles = `
  .sec-page { max-width: 800px; margin: 0 auto; padding: 24px 16px; }

  .sec-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 32px;
  }
  @media (max-width: 640px) {
    .sec-header { flex-direction: column; gap: 16px; }
  }

  .sec-header h1 { font-size: 28px; font-weight: 800; color: #e2e8f0; margin-bottom: 4px; }
  .sec-header p { font-size: 14px; color: #64748b; }

  .sec-back {
    padding: 10px 16px; background: #0f1225; border: 1px solid #1a1f3a;
    border-radius: 8px; color: #e2e8f0; text-decoration: none; font-size: 13px;
    font-weight: 600; transition: all 0.15s;
  }
  .sec-back:hover { border-color: #39ff14; color: #39ff14; }

  .sec-tabs {
    display: flex; gap: 0; margin-bottom: 24px; border-bottom: 1px solid #1a1f3a;
  }

  .sec-tab {
    padding: 12px 16px; font-size: 14px; font-weight: 600; color: #D3D3D3;
    background: none; border: none; cursor: pointer;
    border-bottom: 2px solid transparent; transition: all 0.15s;
  }

  .sec-tab.active {
    color: #39ff14; border-bottom-color: #39ff14;
  }

  .sec-card {
    background: #0f1225; border: 1px solid #1a1f3a; border-radius: 12px;
    padding: 24px;
  }

  .sec-card h2 {
    font-size: 18px; font-weight: 700; color: #e2e8f0; margin-bottom: 8px;
  }

  .sec-desc {
    font-size: 13px; color: #D3D3D3; margin-bottom: 24px;
  }

  .sec-form {
    display: flex; flex-direction: column; gap: 16px;
  }

  .sec-field { display: flex; flex-direction: column; gap: 8px; }

  .sec-label {
    font-size: 13px; font-weight: 600; color: #D3D3D3;
  }

  .sec-input {
    padding: 10px 12px; background: #161a32; border: 1px solid #1a1f3a;
    border-radius: 8px; color: #e2e8f0; font-size: 14px;
    outline: none; transition: border-color 0.15s;
  }

  .sec-input:focus {
    border-color: #39ff14;
  }

  .sec-error {
    padding: 10px 12px; background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.2); border-radius: 8px;
    color: #f87171; font-size: 13px; font-weight: 500;
  }

  .sec-submit {
    padding: 12px 16px; background: #39ff14; border: none;
    border-radius: 8px; color: #fff; font-size: 14px; font-weight: 700;
    cursor: pointer; transition: opacity 0.15s;
  }

  .sec-submit:hover { opacity: 0.9; }
  .sec-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  .sec-twofa {
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px; background: #161a32; border-radius: 8px;
  }
  @media (max-width: 640px) {
    .sec-twofa { flex-direction: column; gap: 16px; align-items: flex-start; }
  }

  .sec-twofa-info {
    display: flex; gap: 16px; align-items: flex-start; flex: 1;
  }

  .sec-twofa-icon {
    font-size: 32px; flex-shrink: 0;
  }

  .sec-twofa-title {
    font-size: 15px; font-weight: 700; color: #e2e8f0; margin-bottom: 4px;
  }

  .sec-twofa-desc {
    font-size: 13px; color: #64748b;
  }

  .sec-twofa-btn {
    padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 700;
    border: none; cursor: pointer; transition: all 0.15s;
  }

  .sec-twofa-btn.enable {
    background: #39ff14; color: #101114;
  }

  .sec-twofa-btn.enable:hover { opacity: 0.9; }
  .sec-twofa-btn.disable {
    background: #1a1f3a; color: #e2e8f0;
  }

  .sec-twofa-btn.disable:hover { background: #1e2243; }
  .sec-twofa-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .sec-sessions {
    display: flex; flex-direction: column; gap: 12px;
  }

  .sec-session-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px; background: #161a32; border-radius: 8px;
    border: 1px solid #1a1f3a;
  }
  @media (max-width: 640px) {
    .sec-session-item { flex-direction: column; gap: 12px; align-items: flex-start; }
  }

  .sec-session-info { flex: 1; }
  .sec-session-device { font-size: 14px; font-weight: 600; color: #e2e8f0; margin-bottom: 4px; }
  .sec-session-location { font-size: 12px; color: #64748b; margin-bottom: 4px; }
  .sec-session-time { font-size: 12px; color: #4a5580; }

  .sec-session-actions {
    display: flex; gap: 8px; align-items: center;
  }

  .sec-session-badge {
    display: inline-block; padding: 4px 8px; background: rgba(57,255,20,0.1);
    border-radius: 4px; color: #39ff14; font-size: 12px; font-weight: 600;
  }

  .sec-session-logout {
    padding: 6px 12px; background: #ef4444; border: none;
    border-radius: 6px; color: #fff; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: opacity 0.15s;
  }

  .sec-session-logout:hover { opacity: 0.9; }

  .sec-session-note {
    padding: 12px 16px; background: #161a32; border-radius: 8px;
    color: #64748b; font-size: 12px; margin-top: 12px;
  }
`;
