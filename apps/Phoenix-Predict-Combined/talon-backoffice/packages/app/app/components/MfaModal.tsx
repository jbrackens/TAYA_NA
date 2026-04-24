"use client";

import React, { useState } from "react";
import Modal from "./Modal";
import CodeInput from "./CodeInput";
import {
  verifyMfa,
  requestMfaCode,
  VerifyMfaResponse,
} from "../lib/api/auth-client";

interface MfaModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: (response: VerifyMfaResponse) => void;
  userId: string;
  action?: string;
}

export default function MfaModal({
  open,
  onClose,
  onVerified,
  userId,
  action,
}: MfaModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestingCode, setRequestingCode] = useState(false);

  const handleCodeComplete = async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await verifyMfa({
        user_id: userId,
        code,
        action,
      });
      onVerified(response);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Verification failed";
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleRequestNewCode = async () => {
    setRequestingCode(true);
    setError(null);
    try {
      await requestMfaCode({ user_id: userId, method: "sms" });
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to request new code";
      setError(errorMessage);
    } finally {
      setRequestingCode(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "16px",
    fontWeight: "600",
    color: "#e2e8f0",
    marginBottom: "8px",
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "12px",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "8px 12px",
    backgroundColor: "transparent",
    border: "1px solid var(--accent)",
    color: "var(--accent)",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s",
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Two-Factor Authentication"
      maxWidth={400}
    >
      <div style={containerStyle}>
        <div>
          <h3 style={titleStyle}>Enter verification code</h3>
          <p style={descriptionStyle}>
            We've sent a 6-digit code to your registered phone number.
          </p>
        </div>

        <CodeInput
          length={6}
          onComplete={handleCodeComplete}
          error={error || undefined}
          disabled={loading}
        />

        {error && (
          <div
            style={{ fontSize: "13px", color: "var(--no)", marginTop: "8px" }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleRequestNewCode}
          disabled={requestingCode}
          style={{
            ...buttonStyle,
            opacity: requestingCode ? 0.6 : 1,
            cursor: requestingCode ? "not-allowed" : "pointer",
          }}
        >
          {requestingCode ? "Requesting..." : "Request New Code"}
        </button>
      </div>
    </Modal>
  );
}
