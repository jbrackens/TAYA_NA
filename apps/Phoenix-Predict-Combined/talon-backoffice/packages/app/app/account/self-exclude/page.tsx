"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  Wallet,
  Lock,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/ToastProvider";
import {
  selfExclude,
  SelfExcludeResponse,
} from "../../lib/api/compliance-client";

type Step = "warning" | "form" | "confirm" | "success";
type Duration = "1" | "5" | "lifetime";

export default function SelfExcludePage() {
  const { user } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<Step>("warning");
  const [duration, setDuration] = useState<Duration>("1");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SelfExcludeResponse | null>(null);

  const durationLabel =
    duration === "1" ? "1 Year" : duration === "5" ? "5 Years" : "Lifetime";

  const handleProceed = () => {
    setStep("form");
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
  };

  const handleConfirmToggle = () => {
    setConfirmed(!confirmed);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirmed) {
      toast.error(
        "Confirmation required",
        "Please confirm you understand the consequences",
      );
      return;
    }

    if (!reason.trim()) {
      toast.error(
        "Reason required",
        "Please provide a reason for self-exclusion",
      );
      return;
    }

    setStep("confirm");
  };

  const handleConfirmExclude = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const res = await selfExclude({
        user_id: user.id,
        reason: reason.trim(),
        duration_years: duration === "lifetime" ? undefined : Number(duration),
      });
      setResult(res);
      setStep("success");
      toast.success("Self-excluded", "Your account has been self-excluded");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const msg = message || "Failed to self-exclude";
      toast.error("Self-exclusion failed", msg);
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: selfExcludeStyles }} />
      <div className="se-page">
        <div className="se-header">
          <h1>Self-Exclusion</h1>
          <p>Permanently exclude yourself from your account</p>
        </div>

        {/* Warning Step */}
        {step === "warning" && (
          <div className="se-card se-warning-card">
            <div className="se-warning-icon">
              <AlertTriangle size={48} strokeWidth={1.5} color="var(--no)" />
            </div>
            <h2>Important Notice</h2>
            <div className="se-warning-content">
              <p>
                Self-exclusion is a permanent decision that will close your
                account immediately.
              </p>

              <div className="se-consequence-list">
                <div className="se-consequence-item">
                  <span className="se-consequence-icon">
                    <Ban size={20} strokeWidth={1.75} />
                  </span>
                  <div>
                    <strong>Account Closure</strong>
                    <p>
                      Your account will be completely blocked and cannot be
                      reopened
                    </p>
                  </div>
                </div>

                <div className="se-consequence-item">
                  <span className="se-consequence-icon">
                    <Wallet size={20} strokeWidth={1.75} />
                  </span>
                  <div>
                    <strong>Balance Handling</strong>
                    <p>
                      Any remaining balance will be processed according to our
                      policy
                    </p>
                  </div>
                </div>

                <div className="se-consequence-item">
                  <span className="se-consequence-icon">
                    <Lock size={20} strokeWidth={1.75} />
                  </span>
                  <div>
                    <strong>No Access</strong>
                    <p>
                      You will not be able to place bets or use any account
                      features
                    </p>
                  </div>
                </div>

                <div className="se-consequence-item">
                  <span className="se-consequence-icon">
                    <Clock size={20} strokeWidth={1.75} />
                  </span>
                  <div>
                    <strong>
                      {duration === "lifetime"
                        ? "Permanent Exclusion"
                        : `${durationLabel} Exclusion`}
                    </strong>
                    <p>
                      {duration === "lifetime"
                        ? "This is a permanent action with no exceptions"
                        : `Your account will be excluded for ${durationLabel.toLowerCase()}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="se-help-section">
                <strong>Need Help?</strong>
                <p>
                  If you're struggling with gambling, please contact our support
                  team or visit responsible gaming resources:
                </p>
                <ul>
                  <li>National Problem Gambling Helpline: 1-800-GAMBLER</li>
                  <li>Gamblers Anonymous: www.gamblersanonymous.org</li>
                </ul>
              </div>
            </div>

            <div className="se-actions">
              <Link href="/account" className="se-btn se-btn-secondary">
                Cancel
              </Link>
              <button className="se-btn se-btn-primary" onClick={handleProceed}>
                I Understand, Continue
              </button>
            </div>
          </div>
        )}

        {/* Form Step */}
        {step === "form" && (
          <div className="se-card">
            <h2>Self-Exclusion Request</h2>
            <p className="se-desc">
              Please provide a reason for your self-exclusion request
            </p>

            <form onSubmit={handleSubmit} className="se-form">
              <div className="se-field">
                <label className="se-label">Exclusion Duration</label>
                <div className="se-duration-options">
                  <button
                    type="button"
                    className={`se-duration-btn${
                      duration === "1" ? " active" : ""
                    }`}
                    onClick={() => setDuration("1")}
                  >
                    1 Year
                  </button>
                  <button
                    type="button"
                    className={`se-duration-btn${
                      duration === "5" ? " active" : ""
                    }`}
                    onClick={() => setDuration("5")}
                  >
                    5 Years
                  </button>
                  <button
                    type="button"
                    className={`se-duration-btn${
                      duration === "lifetime" ? " active" : ""
                    }`}
                    onClick={() => setDuration("lifetime")}
                  >
                    Lifetime
                  </button>
                </div>
              </div>

              <div className="se-field">
                <label className="se-label">Reason for Self-Exclusion</label>
                <textarea
                  className="se-textarea"
                  value={reason}
                  onChange={handleReasonChange}
                  placeholder="Please tell us why you want to self-exclude (optional but helpful)"
                  rows={6}
                />
                <div className="se-char-count">{reason.length} characters</div>
              </div>

              <div className="se-confirmation">
                <label className="se-checkbox">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={handleConfirmToggle}
                  />
                  <span>
                    I understand that self-exclusion is permanent and my account
                    cannot be reopened
                  </span>
                </label>
              </div>

              <div className="se-actions">
                <button
                  type="button"
                  className="se-btn se-btn-secondary"
                  onClick={() => setStep("warning")}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="se-btn se-btn-primary"
                  disabled={!confirmed || !reason.trim()}
                >
                  Continue to Confirmation
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Confirmation Step */}
        {step === "confirm" && (
          <div className="se-card se-confirm-card">
            <div className="se-confirm-icon">
              <ShieldCheck size={48} strokeWidth={1.5} color="#fbbf24" />
            </div>
            <h2>Confirm Self-Exclusion</h2>
            <p className="se-desc">
              Please review your request before proceeding
            </p>

            <div className="se-review">
              <div className="se-review-item">
                <div className="se-review-label">Duration</div>
                <div className="se-review-value">{durationLabel}</div>
              </div>

              <div className="se-review-item">
                <div className="se-review-label">Reason</div>
                <div className="se-review-value">{reason}</div>
              </div>

              <div
                className="se-review-warning"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <AlertTriangle
                  size={16}
                  strokeWidth={2}
                  style={{ flexShrink: 0 }}
                />
                This action cannot be undone. Your account will be permanently
                closed.
              </div>
            </div>

            <div className="se-actions">
              <button
                className="se-btn se-btn-secondary"
                onClick={() => setStep("form")}
              >
                Back to Edit
              </button>
              <button
                className="se-btn se-btn-danger"
                onClick={handleConfirmExclude}
                disabled={loading}
              >
                {loading ? "Processing..." : "Confirm Self-Exclusion"}
              </button>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === "success" && result && (
          <div className="se-card se-success-card">
            <div className="se-success-icon">
              <CheckCircle2 size={56} strokeWidth={1.5} color="var(--accent)" />
            </div>
            <h2>Self-Exclusion Confirmed</h2>
            <p className="se-desc">
              Your account has been successfully self-excluded
            </p>

            <div className="se-success-details">
              <div className="se-detail-item">
                <span className="se-detail-label">Status:</span>
                <span className="se-detail-value">{result.status}</span>
              </div>
              <div className="se-detail-item">
                <span className="se-detail-label">Excluded Until:</span>
                <span className="se-detail-value">
                  {new Date(result.excludedUntil).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="se-success-message">
              <strong>Your account is now permanently closed.</strong>
              <p>
                If you need support or have questions about responsible gaming,
                please contact us.
              </p>
            </div>

            <div className="se-actions">
              <a href="/" className="se-btn se-btn-primary">
                Return to Home
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const selfExcludeStyles = `
  .se-page { max-width: 700px; margin: 0 auto; padding: 24px 16px; }

  .se-header {
    text-align: center; margin-bottom: 32px;
  }

  .se-header h1 {
    font-size: 28px; font-weight: 800; color: var(--t1); margin-bottom: 4px;
  }

  .se-header p {
    font-size: 14px; color: #64748b;
  }

  .se-card {
    background: rgba(0, 0, 0, 0.22); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px;
    padding: 32px; margin-bottom: 24px;
  }

  .se-card h2 {
    font-size: 20px; font-weight: 700; color: var(--t1); margin-bottom: 8px;
  }

  .se-desc {
    font-size: 13px; color: #64748b; margin-bottom: 24px;
  }

  .se-warning-card {
    border-color: var(--no);
  }

  .se-warning-icon {
    font-size: 48px; text-align: center; margin-bottom: 16px;
  }

  .se-warning-content {
    display: flex; flex-direction: column; gap: 20px;
  }

  .se-warning-content p {
    font-size: 14px; color: var(--t1); line-height: 1.6;
  }

  .se-consequence-list {
    display: flex; flex-direction: column; gap: 12px;
  }

  .se-consequence-item {
    display: flex; gap: 12px; padding: 12px; background: rgba(255, 255, 255, 0.04);
    border-radius: 8px; border-left: 3px solid var(--no);
  }

  .se-consequence-icon {
    font-size: 20px; flex-shrink: 0;
  }

  .se-consequence-item strong {
    display: block; color: var(--t1); font-size: 13px; margin-bottom: 2px;
  }

  .se-consequence-item p {
    font-size: 12px; color: #64748b; margin: 0;
  }

  .se-help-section {
    padding: 16px; background: rgba(59,130,246,0.05); border-radius: 8px;
    border: 1px solid rgba(59,130,246,0.2);
  }

  .se-help-section strong {
    display: block; color: var(--t1); margin-bottom: 8px; font-size: 13px;
  }

  .se-help-section p {
    font-size: 12px; color: #D3D3D3; margin: 0 0 8px 0;
  }

  .se-help-section ul {
    margin: 0; padding-left: 20px; font-size: 12px; color: #D3D3D3;
  }

  .se-help-section li {
    margin-bottom: 4px;
  }

  .se-duration-options {
    display: flex; flex-direction: row; gap: 10px;
  }

  .se-duration-btn {
    flex: 1; padding: 12px 16px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px; color: #D3D3D3; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; text-align: center;
  }

  .se-duration-btn:hover {
    border-color: var(--accent); color: var(--accent);
  }

  .se-duration-btn.active {
    background: rgba(43, 228, 128,0.1); border-color: var(--accent); color: var(--accent);
  }

  .se-form {
    display: flex; flex-direction: column; gap: 20px;
  }

  .se-field {
    display: flex; flex-direction: column; gap: 8px;
  }

  .se-label {
    font-size: 13px; font-weight: 600; color: #D3D3D3;
  }

  .se-textarea {
    padding: 12px 14px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px; color: var(--t1); font-size: 13px; font-family: inherit;
    outline: none; resize: vertical; transition: border-color 0.15s;
  }

  .se-textarea:focus {
    border-color: var(--accent);
  }

  .se-char-count {
    font-size: 11px; color: #4a5580;
  }

  .se-confirmation {
    padding: 12px 16px; background: rgba(255, 255, 255, 0.04); border-radius: 8px;
  }

  .se-checkbox {
    display: flex; align-items: flex-start; gap: 10px; cursor: pointer;
  }

  .se-checkbox input {
    margin-top: 2px; cursor: pointer;
  }

  .se-checkbox span {
    font-size: 13px; color: #D3D3D3; line-height: 1.4;
  }

  .se-confirm-card {
    text-align: center;
  }

  .se-confirm-icon {
    font-size: 48px; margin-bottom: 16px;
  }

  .se-review {
    display: flex; flex-direction: column; gap: 16px; margin: 24px 0;
  }

  .se-review-item {
    padding: 16px; background: rgba(255, 255, 255, 0.04); border-radius: 8px; text-align: left;
  }

  .se-review-label {
    font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 4px;
  }

  .se-review-value {
    font-size: 14px; color: var(--t1); word-break: break-word;
  }

  .se-review-warning {
    padding: 12px 16px; background: rgba(255, 155, 107, 0.08);
    border: 1px solid rgba(255, 155, 107, 0.2); border-radius: 8px;
    color: var(--no); font-size: 13px; font-weight: 600;
  }

  .se-success-card {
    text-align: center; border-color: var(--accent);
  }

  .se-success-icon {
    font-size: 56px; margin-bottom: 16px;
  }

  .se-success-details {
    padding: 20px; background: rgba(255, 255, 255, 0.04); border-radius: 8px;
    margin: 24px 0;
  }

  .se-detail-item {
    display: flex; justify-content: space-between; padding: 8px 0;
    font-size: 13px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .se-detail-item:last-child {
    border-bottom: none;
  }

  .se-detail-label {
    color: #64748b; font-weight: 600;
  }

  .se-detail-value {
    color: var(--t1); font-weight: 700;
  }

  .se-success-message {
    padding: 16px; background: rgba(34,197,94,0.08);
    border: 1px solid rgba(34,197,94,0.2); border-radius: 8px;
    margin: 16px 0;
  }

  .se-success-message strong {
    display: block; color: var(--accent); margin-bottom: 8px; font-size: 14px;
  }

  .se-success-message p {
    font-size: 13px; color: #D3D3D3; margin: 0;
  }

  .se-actions {
    display: flex; gap: 12px; margin-top: 24px;
  }
  @media (max-width: 640px) {
    .se-actions { flex-direction: column-reverse; }
  }

  .se-btn {
    flex: 1; padding: 12px 20px; border: none; border-radius: 8px;
    font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s;
  }

  .se-btn-primary {
    background: var(--accent); color: #04140a;
  }

  .se-btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }

  .se-btn-secondary {
    background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); color: var(--t1);
  }

  .se-btn-secondary:hover {
    border-color: var(--accent); color: var(--accent);
  }

  .se-btn-danger {
    background: var(--no); color: #fff;
  }

  .se-btn-danger:hover:not(:disabled) {
    opacity: 0.9;
  }

  .se-btn:disabled {
    opacity: 0.5; cursor: not-allowed;
  }
`;
