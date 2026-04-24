"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "../../lib/api";

interface Errors {
  [key: string]: string;
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMessage(
        "Invalid or missing reset token. Please request a new password reset.",
      );
    }
  }, [token]);

  const validateForm = (): boolean => {
    const newErrors: Errors = {};

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!token) {
      setErrorMessage("Invalid or missing reset token");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({
        token,
        new_password: password,
      });

      setSuccessMessage("Password reset successfully! Redirecting to login...");
      setSubmitted(true);

      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <style>{`
        .rp-head { text-align: center; margin-bottom: 24px; }
        .rp-title {
          margin: 0 0 8px;
          font-size: 28px;
          font-weight: 800;
          color: var(--t1);
          letter-spacing: -0.02em;
        }
        .rp-sub { margin: 0; font-size: 14px; color: var(--t2); line-height: 1.55; }
        .rp-alert {
          padding: 10px 12px;
          margin-bottom: 16px;
          border-radius: var(--r-sm);
          font-size: 12px;
        }
        .rp-alert.err {
          background: rgba(255, 155, 107, 0.12);
          border: 1px solid rgba(255, 155, 107, 0.3);
          color: var(--no);
        }
        .rp-alert.ok {
          background: rgba(43, 228, 128, 0.1);
          border: 1px solid rgba(43, 228, 128, 0.28);
          color: var(--accent);
        }
        .rp-label {
          display: block;
          margin-bottom: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--t3);
        }
        .rp-field-err {
          font-size: 12px;
          color: var(--no);
          margin-top: 4px;
        }
        .rp-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 22px 0 16px;
        }
        .rp-divider::before, .rp-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
        }
        .rp-divider span {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--t3);
        }
        .rp-links {
          text-align: center;
          color: var(--t2);
          font-size: 13px;
        }
        .rp-links > div { margin-bottom: 8px; }
        .rp-links > div:last-child { margin-bottom: 0; }
      `}</style>
      <div className="auth-card">
        <div className="rp-head">
          <span className="auth-eyebrow">Set a new password</span>
          <h1 className="rp-title">Reset password</h1>
          <p className="rp-sub">Pick something at least 8 characters long.</p>
        </div>

        {errorMessage && <div className="rp-alert err">{errorMessage}</div>}
        {successMessage && <div className="rp-alert ok">{successMessage}</div>}

        {!submitted && token && (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div>
              <label className="rp-label" htmlFor="rp-pw">
                New password
              </label>
              <input
                id="rp-pw"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.password;
                      return newErrors;
                    });
                  }
                }}
                placeholder="At least 8 characters"
                className="auth-input"
                style={{ width: "100%", boxSizing: "border-box" }}
                disabled={isLoading}
              />
              {errors.password && (
                <div className="rp-field-err">{errors.password}</div>
              )}
            </div>

            <div>
              <label className="rp-label" htmlFor="rp-pw2">
                Confirm password
              </label>
              <input
                id="rp-pw2"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.confirmPassword;
                      return newErrors;
                    });
                  }
                }}
                placeholder="Confirm your password"
                className="auth-input"
                style={{ width: "100%", boxSizing: "border-box" }}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <div className="rp-field-err">{errors.confirmPassword}</div>
              )}
            </div>

            <button type="submit" disabled={isLoading} className="auth-submit">
              {isLoading ? "Resetting…" : "Reset password"}
            </button>
          </form>
        )}

        <div className="rp-divider">
          <span>or</span>
        </div>

        <div className="rp-links">
          <div>
            <Link href="/auth/login" className="auth-link">
              Back to login
            </Link>
          </div>
          <div>
            Need help?{" "}
            <Link href="/auth/forgot-password" className="auth-link">
              Request another reset
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
