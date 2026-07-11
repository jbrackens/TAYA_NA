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
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { safeReturnPath, returnUrlSuffix } from "../../lib/safeReturnPath";
import { FEATURE_SOCIAL_AUTH } from "../../lib/features";
import { brand } from "../../lib/brand";
import BrandMark from "../../components/BrandMark";
import BrandWordmark from "../../components/BrandWordmark";
import SocialAuthButtons from "../../components/auth/SocialAuthButtons";

const SHELL_CLASS = "flex min-h-screen items-center justify-center px-5 py-10";
const CARD_CLASS =
  "relative w-full max-w-[440px] rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] px-[34px] pb-[30px] pt-9";
const HEAD_CLASS = "mb-6 text-center";
const EYEBROW_CLASS =
  "mb-3.5 inline-block rounded-full border border-[rgba(43,228,128,0.3)] bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]";
const SUBTITLE_CLASS = "m-0 text-sm leading-[1.55] text-[var(--t2)]";
const FORM_CLASS = "flex flex-col gap-3.5";
const FIELD_CLASS = "flex flex-col gap-1.5";
const FIELD_LABEL_CLASS =
  "text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--t3)]";
const INPUT_CLASS =
  "w-full box-border rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] px-3.5 py-3 text-sm text-[var(--t1)] outline-none transition-[border-color] duration-150 ease-[ease] placeholder:text-[var(--t4)] focus-visible:border-[var(--accent)] focus-visible:shadow-[0_0_0_2px_var(--accent-soft)] [font-family:inherit]";
const ERROR_CLASS =
  "rounded-[var(--r-sm)] border border-[rgba(255,155,107,0.3)] bg-[rgba(255,155,107,0.1)] px-3 py-2.5 text-xs text-[var(--no-text)]";
const SUBMIT_CLASS =
  "mt-1 cursor-pointer rounded-[var(--r-rh-md)] border-0 bg-[var(--accent)] px-4 py-3.5 text-sm font-bold tracking-[0.02em] text-[#04140a] transition-[transform,filter] duration-[180ms] ease-[ease] enabled:hover:-translate-y-px enabled:hover:brightness-[1.05] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 [font-family:inherit]";
const LINKS_CLASS = "flex justify-end";
const LINK_CLASS =
  "text-xs text-[var(--t3)] no-underline transition-colors duration-150 hover:text-[var(--t1)]";
const LINK_ACCENT_CLASS =
  "font-semibold text-[var(--accent)] hover:text-[var(--accent)] hover:brightness-110";
const DEV_CLASS =
  "mt-[18px] rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] px-3.5 py-3";
const DEV_EYEBROW_CLASS =
  "mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--t3)]";
const MONO_CLASS =
  "tabular-nums [font-family:'IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace]";
const DIVIDER_CLASS =
  "my-5 mb-4 flex items-center gap-3 before:h-px before:flex-1 before:bg-[var(--border-1)] before:content-[''] after:h-px after:flex-1 after:bg-[var(--border-1)] after:content-['']";
const DIVIDER_TEXT_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--t3)]";
const SOCIAL_CLASS = "mb-5";
const FOOTER_CLASS =
  "border-t border-[var(--border-1)] pt-3.5 text-center text-[13px] text-[var(--t2)]";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
        // Honor ?returnUrl=… if it's a safe same-origin path. Falls
        // back to /predict otherwise. This is what makes logging in
        // from /portfolio, /rewards, /leaderboards, etc. land back on
        // the page the user originally asked for.
        router.push(safeReturnPath(searchParams.get("returnUrl")));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Login failed");
      } finally {
        setSubmitting(false);
      }
    },
    [username, password, login, router, searchParams],
  );

  // LC-05: carry a deep-link returnUrl across to the sign-up flow so a
  // user who chose "Sign up" from a gated page still lands back on it.
  const registerHref =
    "/auth/register" + returnUrlSuffix(searchParams.get("returnUrl"));

  return (
    <div className={SHELL_CLASS}>
      <div className={CARD_CLASS}>
        <header className={HEAD_CLASS}>
          <span className={EYEBROW_CLASS}>Player access</span>
          {/* P10: the auth card carries the real lockup (mark + drawn
              wordmark), not a plain-text heading — brand-consistent with
              the register split-screen and the nav. */}
          <h1 className="m-0 flex items-center justify-center gap-2.5 text-[var(--brand-ink)]">
            <BrandMark size={30} />
            <BrandWordmark height={22} label={brand.name} />
          </h1>
          <p className={SUBTITLE_CLASS}>
            Sign in to track your positions, follow market moves, and trade on
            real-world outcomes.
          </p>
        </header>

        <form onSubmit={onSubmit} className={FORM_CLASS} noValidate>
          <label className={FIELD_CLASS}>
            <span className={FIELD_LABEL_CLASS}>Username or email</span>
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={INPUT_CLASS}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className={FIELD_CLASS}>
            <span className={FIELD_LABEL_CLASS}>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT_CLASS}
              placeholder="••••••••"
              required
            />
          </label>

          {error && <div className={ERROR_CLASS}>{error}</div>}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className={SUBMIT_CLASS}
          >
            {submitting ? "Signing in…" : "Log in"}
          </button>

          <div className={LINKS_CLASS}>
            <Link href="/auth/forgot-password" className={LINK_CLASS}>
              Forgot password?
            </Link>
          </div>
        </form>

        {isLocalDev && (
          <aside className={DEV_CLASS}>
            <span className={DEV_EYEBROW_CLASS}>Local demo access</span>
            <p className="m-0 text-[13px] text-[var(--t2)]">
              <span className={MONO_CLASS}>demo@taptrade.local</span> · password{" "}
              <span className={MONO_CLASS}>demo123</span>
            </p>
          </aside>
        )}

        {FEATURE_SOCIAL_AUTH && (
          <>
            <div className={DIVIDER_CLASS}>
              <span className={DIVIDER_TEXT_CLASS}>or continue with</span>
            </div>

            <div className={SOCIAL_CLASS}>
              <SocialAuthButtons />
            </div>
          </>
        )}

        <footer className={FOOTER_CLASS}>
          New to {brand.name}?{" "}
          <Link
            href={registerHref}
            className={`${LINK_CLASS} ${LINK_ACCENT_CLASS}`}
          >
            Create an account
          </Link>
        </footer>
      </div>
    </div>
  );
}
