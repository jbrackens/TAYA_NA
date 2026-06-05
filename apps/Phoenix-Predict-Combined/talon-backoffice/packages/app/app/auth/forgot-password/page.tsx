"use client";

// Self-service password reset is not yet implemented backend-side (no
// /api/v1/auth/forgot-password route, no reset-token store, no email
// delivery in the stack — UAT 2026-05-16 LC-12). Until the feature ships,
// this page is an honest notice rather than a form that POSTs to a 404
// and tells the user "check your email" when nothing was sent.
import Link from "next/link";

const SUPPORT_EMAIL = "support@tiangge.com";
const SHELL_CLASS = "flex min-h-screen items-center justify-center px-5 py-10";
const CARD_CLASS =
  "relative w-full max-w-[440px] rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] px-[34px] pb-[30px] pt-9 text-[var(--t1)]";
const HEAD_CLASS = "mb-6 text-center";
const EYEBROW_CLASS =
  "mb-3.5 inline-block rounded-[var(--r-pill)] border border-[rgba(43,228,128,0.3)] bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]";
const TITLE_CLASS =
  "m-0 mb-2 text-[28px] font-extrabold tracking-[-0.02em] text-[var(--t1)]";
const SUBTITLE_CLASS = "m-0 text-sm leading-[1.55] text-[var(--t2)]";
const ALERT_ERROR_CLASS =
  "mb-4 rounded-[var(--r-sm)] border border-[rgba(255,155,107,0.3)] bg-[rgba(255,155,107,0.12)] px-3 py-2.5 text-xs text-[var(--no-text)]";
const LINK_CLASS =
  "font-semibold text-[var(--accent)] no-underline hover:text-[var(--accent)] hover:brightness-110 hover:underline";
const DIVIDER_CLASS =
  "mb-4 mt-[22px] flex items-center gap-3 before:h-px before:flex-1 before:bg-[rgba(255,255,255,0.08)] before:content-[''] after:h-px after:flex-1 after:bg-[rgba(255,255,255,0.08)] after:content-['']";
const DIVIDER_TEXT_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--t3)]";
const LINKS_CLASS = "text-center text-[13px] text-[var(--t2)]";
const LINK_ROW_CLASS = "mb-2 last:mb-0";

export default function ForgotPasswordPage() {
  return (
    <div className={SHELL_CLASS}>
      <div className={CARD_CLASS}>
        <div className={HEAD_CLASS}>
          <span className={EYEBROW_CLASS}>Reset access</span>
          <h1 className={TITLE_CLASS}>Forgot password?</h1>
          <p className={SUBTITLE_CLASS}>
            Self-service password reset isn&apos;t available yet.
          </p>
        </div>

        <div className={ALERT_ERROR_CLASS} role="status">
          To recover your account, email{" "}
          <a className={LINK_CLASS} href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          from your registered address and our team will help you reset your
          password.
        </div>

        <div className={DIVIDER_CLASS}>
          <span className={DIVIDER_TEXT_CLASS}>or</span>
        </div>

        <div className={LINKS_CLASS}>
          <div className={LINK_ROW_CLASS}>
            Remembered it?{" "}
            <Link href="/auth/login" className={LINK_CLASS}>
              Sign in
            </Link>
          </div>
          <div className={LINK_ROW_CLASS}>
            New here?{" "}
            <Link href="/auth/register" className={LINK_CLASS}>
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
