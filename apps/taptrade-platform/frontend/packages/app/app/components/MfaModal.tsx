"use client";

import { useState } from "react";
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Two-Factor Authentication"
      maxWidth={400}
    >
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="mb-2 text-base font-semibold text-[#e2e8f0]">
            Enter verification code
          </h3>
          <p className="mb-3 text-[13px] text-[#64748b]">
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
          <div className="mt-2 text-[13px] text-[var(--no)]">{error}</div>
        )}

        <button
          onClick={handleRequestNewCode}
          disabled={requestingCode}
          className="cursor-pointer rounded border border-[var(--accent)] bg-transparent px-3 py-2 text-[13px] font-semibold text-[var(--accent)] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {requestingCode ? "Requesting..." : "Request New Code"}
        </button>
      </div>
    </Modal>
  );
}
