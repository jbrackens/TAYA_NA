"use client";

/**
 * LoginPage — Predict-native auth entry.
 *
 * Card-centered on the cyan-glow shell (predict-auth-layout). Uses the
 * same mono/tokens as the rest of the player app. Replaces the old
 * neon-green sportsbook card wholesale.
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const isLocalDev = process.env.NODE_ENV !== "production";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!username || !password) return;
      setSubmitting(true);
      setError(null);
      try {
        await login(username, password);
        router.push("/predict");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Login failed");
      } finally {
        setSubmitting(false);
      }
    },
    [username, password, login, router],
  );

  return (
    <div className="la-shell">
      <Styles />
      <div className="la-card">
        <header className="la-head">
          <span className="la-eyebrow">Player access</span>
          <h1 className="la-title">
            TAYA <span>Predict</span>
          </h1>
          <p className="la-sub">
            Sign in to track your positions, follow live markets, and trade on
            real-world outcomes.
          </p>
        </header>

        <form onSubmit={onSubmit} className="la-form" noValidate>
          <label className="la-field">
            <span className="la-field-label">Username or email</span>
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="la-input"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="la-field">
            <span className="la-field-label">Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="la-input"
              placeholder="••••••••"
              required
            />
          </label>

          {error && <div className="la-error">{error}</div>}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className="la-submit"
          >
            {submitting ? "Signing in…" : "Log in"}
          </button>

          <div className="la-links">
            <Link href="/auth/forgot-password" className="la-link">
              Forgot password?
            </Link>
          </div>
        </form>

        {isLocalDev && (
          <aside className="la-dev">
            <span className="la-dev-eyebrow">Local demo access</span>
            <p>
              <span className="mono">demo@phoenix.local</span> · password{" "}
              <span className="mono">demo123</span>
            </p>
          </aside>
        )}

        <div className="la-divider">
          <span>or continue with</span>
        </div>

        <div className="la-oauth">
          <a className="la-oauth-btn" href="/api/v1/auth/oauth/google/start">
            Google
          </a>
          <a className="la-oauth-btn" href="/api/v1/auth/oauth/apple/start">
            Apple
          </a>
        </div>

        <footer className="la-foot">
          New to Predict?{" "}
          <Link href="/auth/register" className="la-link la-link-accent">
            Create an account
          </Link>
        </footer>
      </div>
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      .la-shell {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
      }
      .la-card {
        position: relative;
        width: 100%;
        max-width: 440px;
        padding: 36px 34px 30px;
        border-radius: var(--r-rh-lg);
        background: var(--surface-1);
        border: 1px solid var(--border-1);
      }
      .la-head { text-align: center; margin-bottom: 24px; }
      .la-eyebrow {
        display: inline-block;
        padding: 4px 12px;
        margin-bottom: 14px;
        background: var(--accent-soft);
        border: 1px solid rgba(43, 228, 128,0.3);
        color: var(--accent);
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .la-title {
        margin: 0 0 8px;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--t1);
      }
      .la-title span { color: var(--accent); }
      .la-sub {
        margin: 0;
        font-size: 14px;
        color: var(--t2);
        line-height: 1.55;
      }

      .la-form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .la-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .la-field-label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
      }
      .la-input {
        background: var(--surface-2);
        border: 1px solid var(--border-1);
        border-radius: var(--r-rh-md);
        padding: 12px 14px;
        font-family: inherit;
        font-size: 14px;
        color: var(--t1);
        outline: none;
        transition: border-color 150ms ease;
      }
      .la-input::placeholder { color: var(--t4); }
      .la-input:focus-visible {
        border-color: var(--accent);
        box-shadow: 0 0 0 2px var(--accent-soft);
      }

      .la-error {
        background: rgba(255, 155, 107,0.1);
        border: 1px solid rgba(255, 155, 107,0.3);
        border-radius: var(--r-sm);
        padding: 10px 12px;
        font-size: 12px;
        color: var(--no-text);
      }

      .la-submit {
        margin-top: 4px;
        padding: 14px 16px;
        color: #04140a;
        border: none;
        border-radius: var(--r-rh-md);
        font-family: inherit;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.02em;
        cursor: pointer;
        background: var(--accent);
        transition: transform 180ms ease, filter 180ms ease;
      }
      .la-submit:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
      .la-submit:active:not(:disabled) { transform: scale(0.98); }
      .la-submit:disabled { opacity: 0.5; cursor: not-allowed; }

      .la-links {
        display: flex;
        justify-content: flex-end;
      }
      .la-link {
        font-size: 12px;
        color: var(--t3);
        text-decoration: none;
        transition: color 0.15s;
      }
      .la-link:hover { color: var(--t1); }
      .la-link-accent { color: var(--accent); font-weight: 600; }
      .la-link-accent:hover { color: var(--accent); filter: brightness(1.1); }

      .la-dev {
        margin-top: 18px;
        padding: 12px 14px;
        border-radius: var(--r-rh-md);
        background: var(--surface-2);
        border: 1px solid var(--border-1);
      }
      .la-dev-eyebrow {
        display: block;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
        margin-bottom: 4px;
      }
      .la-dev p { margin: 0; font-size: 13px; color: var(--t2); }

      .la-divider {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 20px 0 16px;
      }
      .la-divider::before, .la-divider::after {
        content: "";
        flex: 1;
        height: 1px;
        background: var(--border-1);
      }
      .la-divider span {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
      }

      .la-oauth {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 20px;
      }
      .la-oauth-btn {
        padding: 11px 14px;
        background: var(--surface-2);
        border: 1px solid var(--border-1);
        border-radius: var(--r-rh-md);
        color: var(--t1);
        font-size: 13px;
        font-weight: 600;
        text-align: center;
        text-decoration: none;
        transition: border-color 150ms ease;
      }
      .la-oauth-btn:hover {
        border-color: var(--border-2);
      }

      .la-foot {
        padding-top: 14px;
        border-top: 1px solid var(--border-1);
        text-align: center;
        font-size: 13px;
        color: var(--t2);
      }
    `}</style>
  );
}
