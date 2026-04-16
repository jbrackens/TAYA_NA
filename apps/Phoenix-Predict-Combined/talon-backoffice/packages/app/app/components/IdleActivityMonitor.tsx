"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { logger } from "../lib/logger";

interface IdleActivityMonitorProps {
  onLogout: () => void;
  onRefreshToken?: () => Promise<void>;
  isAuthenticated: boolean;
  sessionTimeoutSeconds?: number;
  warningSeconds?: number;
}

const SIGN_OUT_TIME = 840;
const WARN_TIME = 60;
const TOKEN_REFRESH_AHEAD = 30;

export const IdleActivityMonitor: React.FC<IdleActivityMonitorProps> = ({
  onLogout,
  onRefreshToken,
  isAuthenticated,
  sessionTimeoutSeconds = SIGN_OUT_TIME,
  warningSeconds = WARN_TIME,
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(warningSeconds);
  const lastActivityRef = useRef<number>(Date.now());
  const countdownIntervalRef = useRef<number | null>(null);
  const warningTimeoutRef = useRef<number | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);
  const warningShownRef = useRef(false);

  // ── Stable callback refs (CLAUDE.md pattern) ──────────────
  // Props like onLogout and onRefreshToken come from useCallback chains
  // that depend on context values (toast, etc.) and can recreate every
  // render. Storing them in refs keeps our effects stable.
  const onLogoutRef = useRef(onLogout);
  useEffect(() => { onLogoutRef.current = onLogout; });

  const onRefreshTokenRef = useRef(onRefreshToken);
  useEffect(() => { onRefreshTokenRef.current = onRefreshToken; });

  const clearSessionTimers = useCallback(() => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  // scheduleSessionTimers uses refs for callbacks, so it only depends
  // on primitive values — no cascading function reference changes.
  const scheduleSessionTimers = useCallback(() => {
    clearSessionTimers();

    const idleMs = Date.now() - lastActivityRef.current;
    const refreshInMs = Math.max(
      0,
      (sessionTimeoutSeconds - TOKEN_REFRESH_AHEAD) * 1000 - idleMs,
    );
    const warningInMs = Math.max(0, sessionTimeoutSeconds * 1000 - idleMs);

    refreshTimeoutRef.current = window.setTimeout(async () => {
      if (!warningShownRef.current) {
        try {
          await onRefreshTokenRef.current?.();
        } catch (err) {
          logger.error("IdleMonitor", "Token refresh failed", err);
        }
      }
    }, refreshInMs);

    warningTimeoutRef.current = window.setTimeout(() => {
      warningShownRef.current = true;
      setShowWarning(true);
      setCountdown(warningSeconds);
    }, warningInMs);
  }, [clearSessionTimers, sessionTimeoutSeconds, warningSeconds]);

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (warningShownRef.current) {
      warningShownRef.current = false;
      setShowWarning(false);
      setCountdown(warningSeconds);
    }

    scheduleSessionTimers();
  }, [scheduleSessionTimers, warningSeconds]);

  // Start/stop timers when auth state changes
  useEffect(() => {
    if (!isAuthenticated) {
      clearSessionTimers();
      warningShownRef.current = false;
      setShowWarning(false);
      return;
    }

    lastActivityRef.current = Date.now();
    scheduleSessionTimers();

    return () => {
      clearSessionTimers();
    };
  }, [clearSessionTimers, isAuthenticated, scheduleSessionTimers]);

  // Attach activity listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ["mousedown", "keydown", "scroll", "touchstart", "focus"];

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, {
        capture: true,
        passive: event === "scroll" || event === "touchstart",
      });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity, true);
      });
    };
  }, [isAuthenticated, handleActivity]);

  // Countdown tick when warning is visible
  useEffect(() => {
    if (!showWarning) return;

    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          onLogoutRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [showWarning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSessionTimers();
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [clearSessionTimers]);

  if (!showWarning || !isAuthenticated) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 12,
          padding: 32,
          maxWidth: 400,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            margin: "0 0 12px 0",
            fontSize: 20,
            fontWeight: 700,
            color: "#1f2937",
          }}
        >
          Inactivity Warning
        </h2>

        <p
          style={{
            margin: "0 0 24px 0",
            fontSize: 14,
            color: "#6b7280",
            lineHeight: 1.5,
          }}
        >
          Your session will expire due to inactivity. Click below to stay logged
          in.
        </p>

        <div
          style={{
            backgroundColor: "#f3f4f6",
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: "#ef4444",
            }}
          >
            {countdown}s
          </p>
          <p
            style={{
              margin: "8px 0 0 0",
              fontSize: 12,
              color: "#6b7280",
            }}
          >
            Seconds remaining
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexDirection: "column",
          }}
        >
          <button
            onClick={handleActivity}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              background: "linear-gradient(135deg, #39ff14 0%, #ea580c 100%)",
              color: "#ffffff",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            }}
          >
            Stay Logged In
          </button>

          <button
            onClick={() => onLogoutRef.current()}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              backgroundColor: "#ffffff",
              color: "#374151",
              transition: "all 0.2s ease",
            }}
          >
            Log Out Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdleActivityMonitor;
