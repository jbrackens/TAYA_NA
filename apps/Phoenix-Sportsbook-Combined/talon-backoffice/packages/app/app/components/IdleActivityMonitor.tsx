'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../lib/logger';

interface IdleActivityMonitorProps {
  onLogout: () => void;
  onRefreshToken?: () => Promise<void>;
  isAuthenticated: boolean;
  sessionTimeoutSeconds?: number; // default 840
  warningSeconds?: number; // default 60
}

const SIGN_OUT_TIME = 840; // 14 minutes in seconds
const WARN_TIME = 60; // 1 minute warning in seconds
const TOKEN_REFRESH_AHEAD = 30; // Refresh token 30 seconds before expiry

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
  const checkIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const showWarningRef = useRef(false);
  const warningShownRef = useRef(false);

  // Update showWarning ref when state changes
  useEffect(() => {
    showWarningRef.current = showWarning;
  }, [showWarning]);

  // Activity event listeners
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Reset warning if user interacts while it's showing
    if (showWarningRef.current) {
      setShowWarning(false);
      warningShownRef.current = false;
      setCountdown(warningSeconds);
    }
  }, [warningSeconds]);

  // Setup activity listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousemove', 'mousedown', 'click', 'scroll', 'keypress', 'load'];

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity, true);
      });
    };
  }, [isAuthenticated, handleActivity]);

  // Token refresh handler
  const refreshAuthToken = useCallback(async () => {
    try {
      if (onRefreshToken) {
        await onRefreshToken();
      }
    } catch (err) {
      logger.error('IdleMonitor', 'Token refresh failed', err);
    }
  }, [onRefreshToken]);

  // Main idle check interval
  useEffect(() => {
    if (!isAuthenticated) return;

    checkIntervalRef.current = window.setInterval(() => {
      const idleTime = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const timeUntilWarning = sessionTimeoutSeconds - idleTime;

      // Check if token needs refresh (30 seconds before timeout)
      if (
        !warningShownRef.current &&
        timeUntilWarning <= TOKEN_REFRESH_AHEAD &&
        timeUntilWarning > 0
      ) {
        refreshAuthToken();
      }

      // Show warning when idle time exceeds threshold
      if (idleTime >= sessionTimeoutSeconds && !warningShownRef.current) {
        warningShownRef.current = true;
        setShowWarning(true);
        setCountdown(warningSeconds);
      }
    }, 1000); // Check every second

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isAuthenticated, sessionTimeoutSeconds, warningSeconds, refreshAuthToken]);

  // Countdown timer for warning modal
  useEffect(() => {
    if (!showWarning) return;

    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Auto logout when countdown reaches 0
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [showWarning, onLogout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  if (!showWarning || !isAuthenticated) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 32,
          maxWidth: 400,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            margin: '0 0 12px 0',
            fontSize: 20,
            fontWeight: 700,
            color: '#1f2937',
          }}
        >
          Inactivity Warning
        </h2>

        <p
          style={{
            margin: '0 0 24px 0',
            fontSize: 14,
            color: '#6b7280',
            lineHeight: 1.5,
          }}
        >
          Your session will expire due to inactivity. Click below to stay logged in.
        </p>

        <div
          style={{
            backgroundColor: '#f3f4f6',
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
              color: '#ef4444',
            }}
          >
            {countdown}s
          </p>
          <p
            style={{
              margin: '8px 0 0 0',
              fontSize: 12,
              color: '#6b7280',
            }}
          >
            Seconds remaining
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            flexDirection: 'column',
          }}
        >
          <button
            onClick={handleActivity}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              color: '#ffffff',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
            }}
          >
            Keep Me Logged In
          </button>

          <button
            onClick={onLogout}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              background: '#ffffff',
              color: '#374151',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ffffff';
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
