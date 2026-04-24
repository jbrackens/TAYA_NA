"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyEmail } from "../../lib/api/auth-client";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMessage("No verification token provided");
      return;
    }

    const verify = async () => {
      try {
        await verifyEmail({ token });
        setState("success");
      } catch (err) {
        setState("error");
        const message =
          err instanceof Error ? err.message : "Verification failed";
        setErrorMessage(message);
      }
    };

    verify();
  }, [token]);

  return (
    <div className="auth-shell">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .ve-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--t1);
          margin: 0 0 16px;
          letter-spacing: -0.01em;
        }
        .ve-msg {
          font-size: 14px;
          color: var(--t2);
          margin: 0 0 24px;
          line-height: 1.6;
        }
        .ve-err {
          font-size: 13px;
          color: var(--no);
          margin: 0 0 16px;
        }
        .ve-spinner {
          display: inline-block;
          width: 28px;
          height: 28px;
          border: 2px solid rgba(255,255,255,0.08);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          box-shadow: 0 0 12px var(--accent-glow-color);
        }
      `}</style>
      <div className="auth-card" style={{ textAlign: "center" }}>
        {state === "loading" && (
          <>
            <h1 className="ve-title">Verifying email…</h1>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <div className="ve-spinner" aria-hidden="true" />
            </div>
            <p className="ve-msg">Hold tight — confirming the token.</p>
          </>
        )}

        {state === "success" && (
          <>
            <h1 className="ve-title">Email verified</h1>
            <p className="ve-msg">
              You&apos;re all set. Log in to pick up where you left off.
            </p>
            <Link
              href="/auth/login"
              className="auth-submit"
              style={{
                display: "inline-flex",
                textDecoration: "none",
                justifyContent: "center",
              }}
            >
              Go to login
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="ve-title">Verification failed</h1>
            <p className="ve-err">{errorMessage}</p>
            <p className="ve-msg">
              The link may have expired. Request a fresh verification email from
              the login page.
            </p>
            <Link
              href="/auth/login"
              className="auth-submit"
              style={{
                display: "inline-flex",
                textDecoration: "none",
                justifyContent: "center",
              }}
            >
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
