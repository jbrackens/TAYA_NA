"use client";

// Self-service password reset is not yet implemented backend-side (no
// /api/v1/auth/forgot-password route, no reset-token store, no email
// delivery in the stack — UAT 2026-05-16 LC-12). Until the feature ships,
// this page is an honest notice rather than a form that POSTs to a 404
// and tells the user "check your email" when nothing was sent.
import Link from "next/link";

const SUPPORT_EMAIL = "support@hula.na";

export default function ForgotPasswordPage() {
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
            Self-service password reset isn&apos;t available yet.
          </p>
        </div>

        <div className="fp-alert err" role="status">
          To recover your account, email{" "}
          <a className="auth-link" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          from your registered address and our team will help you reset your
          password.
        </div>

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
