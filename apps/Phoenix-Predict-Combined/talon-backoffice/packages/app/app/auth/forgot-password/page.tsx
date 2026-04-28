"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = (emailStr: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailStr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim()) {
      setErrorMessage("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      await forgotPassword({ email });
      setSuccessMessage("Check your email for password reset instructions");
      setSubmitted(true);
      setEmail("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(
        message || "Failed to send reset email. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <style>{`
        .fp-head { text-align: center; margin-bottom: 24px; }
        .fp-title {
          margin: 0 0 8px;
          font-size: 28px;
          font-weight: 800;
          color: var(--t1);
          letter-spacing: -0.02em;
        }
        .fp-sub { margin: 0; font-size: 14px; color: var(--t2); line-height: 1.55; }
        .fp-alert {
          padding: 10px 12px;
          margin-bottom: 16px;
          border-radius: var(--r-sm);
          font-size: 12px;
        }
        .fp-alert.err {
          background: rgba(255, 155, 107, 0.12);
          border: 1px solid rgba(255, 155, 107, 0.3);
          color: var(--no-text);
        }
        .fp-alert.ok {
          background: rgba(43, 228, 128, 0.1);
          border: 1px solid rgba(43, 228, 128, 0.28);
          color: var(--accent);
        }
        .fp-label {
          display: block;
          margin-bottom: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--t3);
        }
        .fp-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 22px 0 16px;
        }
        .fp-divider::before, .fp-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
        }
        .fp-divider span {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--t3);
        }
        .fp-links {
          text-align: center;
          color: var(--t2);
          font-size: 13px;
        }
        .fp-links > div { margin-bottom: 8px; }
        .fp-links > div:last-child { margin-bottom: 0; }
      `}</style>
      <div className="auth-card">
        <div className="fp-head">
          <span className="auth-eyebrow">Reset access</span>
          <h1 className="fp-title">Forgot password?</h1>
          <p className="fp-sub">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>

        {errorMessage && <div className="fp-alert err">{errorMessage}</div>}
        {successMessage && <div className="fp-alert ok">{successMessage}</div>}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div>
            <label className="fp-label" htmlFor="fp-email">
              Email address
            </label>
            <input
              id="fp-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMessage) setErrorMessage("");
              }}
              placeholder="you@example.com"
              className="auth-input"
              style={{ width: "100%", boxSizing: "border-box" }}
              disabled={submitted}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || submitted}
            className="auth-submit"
          >
            {isLoading
              ? "Sending…"
              : submitted
                ? "Email sent"
                : "Send reset link"}
          </button>
        </form>

        <div className="fp-divider">
          <span>or</span>
        </div>

        <div className="fp-links">
          <div>
            Remembered it?{" "}
            <Link href="/auth/login" className="auth-link">
              Sign in
            </Link>
          </div>
          <div>
            New here?{" "}
            <Link href="/auth/register" className="auth-link">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
