"use client";

/**
 * RegisterPage — split-screen signup (P9 structure, P11 dress).
 *
 * Layout mirrors the WorkOS-style reference the owner specified: a narrow
 * centered form column (brand lockup → heading → fields → Continue → OR →
 * Continue with Google/Apple/SSO → sign-in link → legal line) beside a
 * full-bleed event panel built from our in-house ambient crowd footage
 * (public/brand/hero-ambient.mp4 + auth-event-poster.jpg) under an ink
 * scrim — no stock imagery, no external hotlinks. The 2-step wizard and the
 * launch-compliance terms/disclosure acceptance are unchanged.
 *
 * P11 "Standing Question" restyle (2026-07-12): serif heading, square
 * bone-recessed inputs with press-blue focus, ink-rectangle primary
 * button, bordered-rectangle secondary, no rounded chrome, no hover
 * lifts. The event-panel scrim moved from forest green to ink. All
 * handlers, returnUrl threading, and disclosure copy are untouched (the
 * qa-regression points-only lock does raw substring matching on it).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { register as registerUser } from "../../lib/api";
import { claimStarterGrant } from "../../lib/api/wallet-client";
import { safeReturnPath, returnUrlSuffix } from "../../lib/safeReturnPath";
import SocialAuthButtons from "../../components/auth/SocialAuthButtons";
import BrandMark from "../../components/BrandMark";
import BrandWordmark from "../../components/BrandWordmark";

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

type Errors = Partial<Record<keyof FormData, string>>;

const EMPTY_FORM: FormData = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
};

const TOTAL_STEPS = 2;
const STEP_TITLES = ["Account", "Terms"];
const TERMS_VERSION = "taptrade-launch-v1";
const LAUNCH_DISCLOSURE_VERSION = "points-no-cashout-v1";

const SHELL_CLASS =
  "grid min-h-screen w-full bg-[var(--surface-1)] lg:grid-cols-[minmax(0,44%)_1fr]";
const FORM_COL_CLASS =
  "flex min-h-screen flex-col overflow-y-auto px-6 py-8 sm:px-12 lg:px-16";
const FORM_INNER_CLASS = "mx-auto flex w-full max-w-[400px] flex-1 flex-col";
const BRAND_ROW_CLASS = "mb-10 inline-flex items-center gap-2.5 no-underline";
// P10: drawn vector wordmark (Schibsted Grotesk text render retired).
const BRAND_WORDMARK_CLASS = "text-[var(--brand-ink)]";
const EVENT_PANEL_CLASS =
  "relative hidden overflow-hidden bg-[var(--brand-ink)] lg:block";
const EVENT_MEDIA_CLASS =
  "absolute inset-0 h-full w-full object-cover opacity-[0.82] motion-reduce:hidden";
const EVENT_POSTER_CLASS =
  "absolute inset-0 h-full w-full object-cover opacity-[0.82]";
const EVENT_SCRIM_CLASS =
  "absolute inset-0 bg-[linear-gradient(200deg,rgba(26,23,18,0.28)_0%,rgba(26,23,18,0.55)_55%,rgba(26,23,18,0.9)_100%)]";
const EVENT_COPY_CLASS =
  "absolute inset-x-0 bottom-0 p-12 text-[var(--brand-on-dark)]";
const EVENT_STATEMENT_CLASS =
  "type-display m-0 max-w-[480px] text-[clamp(28px,3vw,44px)] font-medium leading-[1.08]";
const EVENT_SUB_CLASS =
  "type-standfirst mt-4 max-w-[420px] text-[15px] leading-[1.55] text-[rgba(241,236,227,0.78)]";
const HEAD_CLASS = "mb-6";
const EYEBROW_CLASS =
  "mb-3 inline-block font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--t3)]";
const TITLE_CLASS =
  "type-display m-0 mb-1.5 text-[28px] font-medium leading-[1.15] text-[var(--t1)]";
const SUBTITLE_CLASS = "m-0 text-[13px] text-[var(--t3)]";
const PROGRESS_CLASS =
  "relative mb-[22px] h-1 overflow-hidden border border-[var(--border-1)] bg-[var(--surface-2)]";
const PROGRESS_FILL_BASE_CLASS =
  "absolute inset-y-0 left-0 bg-[var(--accent)] transition-[width] duration-300 ease-[ease]";
const DIVIDER_CLASS =
  "my-0.5 flex items-center gap-3 before:h-px before:flex-1 before:bg-[var(--border-1)] before:content-[''] after:h-px after:flex-1 after:bg-[var(--border-1)] after:content-['']";
const DIVIDER_TEXT_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--t3)]";
const BANNER_BASE_CLASS = "mb-3.5 border px-3 py-2.5 text-[13px]";
const BANNER_ERROR_CLASS =
  "border-[var(--no-border)] bg-[var(--no-soft)] text-[var(--no-text)]";
const BANNER_SUCCESS_CLASS =
  "border-[var(--border-2)] bg-[var(--accent-soft)] text-[var(--accent-text)]";
const FORM_CLASS = "flex flex-col gap-3.5";
const FIELD_CLASS = "flex flex-col gap-1.5";
const FIELD_LABEL_CLASS =
  "text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--t3)]";
const INPUT_BASE_CLASS =
  "border border-[var(--border-1)] bg-[var(--surface-2)] px-[13px] py-[11px] text-sm text-[var(--t1)] outline-none transition-[border-color] duration-150 ease-[ease] placeholder:text-[var(--t4)] focus-visible:border-[var(--accent)] focus-visible:shadow-[0_0_0_2px_var(--accent-soft)] [font-family:inherit]";
const INPUT_ERROR_CLASS = "border-[var(--no-text)]";
const FIELD_ERROR_CLASS = "text-[11px] text-[var(--no-text)]";
const TERMS_CLASS =
  "max-h-[220px] overflow-y-auto border border-[var(--border-1)] bg-[var(--surface-2)] px-4 py-3.5";
const TERMS_TITLE_CLASS = "m-0 mb-2 text-sm font-bold text-[var(--t1)]";
const TERMS_COPY_CLASS = "m-0 mb-2.5 text-xs leading-[1.55] text-[var(--t2)]";
const CHECK_CLASS =
  "flex cursor-pointer items-center gap-2.5 text-[13px] text-[var(--t1)]";
const CHECK_INPUT_CLASS = "size-4 accent-[var(--accent)]";
const SUMMARY_CLASS =
  "border border-[var(--border-1)] bg-[var(--surface-2)] px-3.5 py-3";
const SUMMARY_EYEBROW_CLASS =
  "mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--t3)]";
const SUMMARY_LIST_CLASS = "m-0 flex flex-col gap-1";
const SUMMARY_ROW_CLASS = "flex justify-between gap-2.5 text-xs";
const SUMMARY_TERM_CLASS = "text-[var(--t3)]";
const SUMMARY_DESC_CLASS = "m-0 text-[var(--t1)]";
const MONO_CLASS =
  "tabular-nums [font-family:'IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace]";
const ACTIONS_CLASS = "mt-5 flex gap-2.5";
const BUTTON_BASE_CLASS =
  "flex-1 cursor-pointer border px-3.5 py-[11px] text-[13px] font-bold tracking-[0.02em] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 [font-family:inherit]";
const BUTTON_GHOST_CLASS =
  "border-[var(--border-2)] bg-transparent text-[var(--t2)] enabled:hover:border-[var(--rule-ink)] enabled:hover:text-[var(--t1)]";
const BUTTON_PRIMARY_CLASS =
  "border-transparent bg-[var(--action)] text-(--action-fg) enabled:hover:bg-[var(--action-hover)]";
const FOOTER_CLASS =
  "mt-[18px] border-t border-[var(--border-1)] pt-3.5 text-center text-[13px] text-[var(--t2)]";
const LINK_ACCENT_CLASS =
  "font-semibold text-[var(--accent-text)] no-underline hover:underline";

function progressWidthClass(step: number): string {
  return step === 1 ? "w-1/2" : "w-full";
}

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  // Ambient footage gate (P10, 2026-07-12): mirror the landing-page pattern
  // (app/page.tsx HeroAmbientVideo) — never mount the <video> under
  // prefers-reduced-motion so the 1.6MB MP4 isn't downloaded at all;
  // motion-reduce:hidden alone still fetched it.
  const [canPlayAmbient, setCanPlayAmbient] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setCanPlayAmbient(true);
  }, []);
  // LC-05: preserve a deep-link returnUrl threaded in from the login page
  // so signup doesn't drop the user's original destination.
  const searchParams = useSearchParams();
  const returnSuffix = returnUrlSuffix(searchParams.get("returnUrl"));

  const update = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
      setErrors((e) => ({ ...e, [key]: undefined }));
    },
    [],
  );

  const validate = useCallback(
    (currentStep: number): Errors => {
      const next: Errors = {};
      if (currentStep === 1) {
        if (!form.username.trim()) next.username = "Required";
        else if (form.username.length < 3)
          next.username = "At least 3 characters";
        if (!form.email.trim()) next.email = "Required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
          next.email = "Invalid email";
        if (!form.password) next.password = "Required";
        else if (form.password.length < 7)
          next.password = "At least 7 characters";
        if (!form.confirmPassword) next.confirmPassword = "Required";
        else if (form.password !== form.confirmPassword)
          next.confirmPassword = "Passwords don't match";
      }
      if (currentStep === 2) {
        if (!form.acceptTerms) next.acceptTerms = "You must accept the terms";
      }
      return next;
    },
    [form],
  );

  const onNext = useCallback(() => {
    const v = validate(step);
    setErrors(v);
    if (Object.keys(v).length === 0 && step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  }, [step, validate]);

  const onPrev = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
    }
  }, [step]);

  const onSubmit = useCallback(async () => {
    const v = validate(TOTAL_STEPS);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    let accountCreated = false;
    try {
      await registerUser({
        username: form.username,
        email: form.email,
        password: form.password,
        terms_accepted: true,
        terms_version: TERMS_VERSION,
        launch_disclosure_accepted: true,
        launch_disclosure_version: LAUNCH_DISCLOSURE_VERSION,
      });
      accountCreated = true;
      setSuccessMessage("Account created. Signing you in...");
      const newUser = await login(form.username, form.password);
      const grant = await claimStarterGrant(newUser.id);
      if (grant?.enabled) {
        setSuccessMessage("Starter points added. Opening markets...");
      }
      router.replace(safeReturnPath(searchParams.get("returnUrl")));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      setErrorMessage(
        accountCreated
          ? `Account created, but automatic sign-in failed: ${message}`
          : message,
      );
    } finally {
      setSubmitting(false);
    }
  }, [form, validate, login, router, searchParams]);

  return (
    <div className={SHELL_CLASS}>
      <div className={FORM_COL_CLASS}>
        <div className={FORM_INNER_CLASS}>
          <Link href="/" className={BRAND_ROW_CLASS} aria-label="TapTrade home">
            <BrandMark size={26} />
            <BrandWordmark height={19} className={BRAND_WORDMARK_CLASS} />
          </Link>

          <header className={HEAD_CLASS}>
            <span className={EYEBROW_CLASS}>
              Step {step} of {TOTAL_STEPS} · {STEP_TITLES[step - 1]}
            </span>
            <h1 className={TITLE_CLASS}>Create your account</h1>
            <p className={SUBTITLE_CLASS}>
              Track positions, follow the crowd, trade real-world outcomes.
            </p>
          </header>

          <div className={PROGRESS_CLASS} aria-hidden="true">
            <div
              className={`${PROGRESS_FILL_BASE_CLASS} ${progressWidthClass(step)}`}
            />
          </div>

          {errorMessage && (
            <div className={`${BANNER_BASE_CLASS} ${BANNER_ERROR_CLASS}`}>
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className={`${BANNER_BASE_CLASS} ${BANNER_SUCCESS_CLASS}`}>
              {successMessage}
            </div>
          )}

          {step === 1 && (
            <div className={FORM_CLASS}>
              <Field
                label="Username"
                value={form.username}
                onChange={(v) => update("username", v)}
                placeholder="your-handle"
                error={errors.username}
                autoComplete="username"
              />
              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={(v) => update("email", v)}
                placeholder="you@example.com"
                error={errors.email}
                autoComplete="email"
              />
              <Field
                label="Password"
                type="password"
                value={form.password}
                onChange={(v) => update("password", v)}
                placeholder="At least 7 characters"
                error={errors.password}
                autoComplete="new-password"
              />
              <Field
                label="Confirm password"
                type="password"
                value={form.confirmPassword}
                onChange={(v) => update("confirmPassword", v)}
                placeholder="Confirm your password"
                error={errors.confirmPassword}
                autoComplete="new-password"
              />
            </div>
          )}

          {step === 2 && (
            <div className={FORM_CLASS}>
              <div className={TERMS_CLASS}>
                <h3 className={TERMS_TITLE_CLASS}>Terms and conditions</h3>
                <p className={TERMS_COPY_CLASS}>
                  By creating a TapTrade account you agree to our Terms of
                  Service and Privacy Policy. You must be 18 or older to make
                  predictions on this platform.
                </p>
                <p className="m-0 text-xs leading-[1.55] text-[var(--t2)]">
                  TapTrade uses non-redeemable gameplay points. Starter points
                  are for predictions only; they are not money and{" "}
                  {/* keep "cannot be cashed" on one line — the qa-regression
                      points-only lock does raw substring matching */}
                  cannot be cashed out, withdrawn, transferred, or redeemed for
                  prizes.
                </p>
              </div>

              <label className={CHECK_CLASS}>
                <input
                  type="checkbox"
                  className={CHECK_INPUT_CLASS}
                  checked={form.acceptTerms}
                  onChange={(e) => update("acceptTerms", e.target.checked)}
                />
                <span>
                  I agree to the Terms of Service, Privacy Policy, and
                  points-only no-cashout disclosure
                </span>
              </label>
              {errors.acceptTerms && (
                <div className={FIELD_ERROR_CLASS}>{errors.acceptTerms}</div>
              )}

              <div className={SUMMARY_CLASS}>
                <span className={SUMMARY_EYEBROW_CLASS}>Account summary</span>
                <dl className={SUMMARY_LIST_CLASS}>
                  <div className={SUMMARY_ROW_CLASS}>
                    <dt className={SUMMARY_TERM_CLASS}>Username</dt>
                    <dd className={`${SUMMARY_DESC_CLASS} ${MONO_CLASS}`}>
                      {form.username}
                    </dd>
                  </div>
                  <div className={SUMMARY_ROW_CLASS}>
                    <dt className={SUMMARY_TERM_CLASS}>Email</dt>
                    <dd className={SUMMARY_DESC_CLASS}>{form.email}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          <div className={ACTIONS_CLASS}>
            {step > 1 && (
              <button
                type="button"
                onClick={onPrev}
                disabled={submitting}
                className={`${BUTTON_BASE_CLASS} ${BUTTON_GHOST_CLASS}`}
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={step === TOTAL_STEPS ? onSubmit : onNext}
              disabled={submitting}
              className={`${BUTTON_BASE_CLASS} ${BUTTON_PRIMARY_CLASS}`}
            >
              {submitting
                ? "Processing…"
                : step === TOTAL_STEPS
                  ? "Create account"
                  : "Continue"}
            </button>
          </div>

          {step === 1 && (
            <>
              <div className={`${DIVIDER_CLASS} my-5`}>
                <span className={DIVIDER_TEXT_CLASS}>or</span>
              </div>
              <SocialAuthButtons
                variant="stacked"
                providers={["google", "apple", "sso"]}
              />
            </>
          )}

          <p className="mt-6 text-xs leading-[1.55] text-[var(--t3)]">
            By creating an account you agree to the{" "}
            <Link href="/tos" className="text-[var(--t2)] underline">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-[var(--t2)] underline">
              Privacy Policy
            </Link>
            . TapTrade uses non-redeemable gameplay points.
          </p>

          <footer className={FOOTER_CLASS}>
            Already have an account?{" "}
            <Link
              href={"/auth/login" + returnSuffix}
              className={LINK_ACCENT_CLASS}
            >
              Sign in
            </Link>
          </footer>
        </div>
      </div>

      {/* Event panel — in-house ambient crowd footage under an ink scrim.
          Poster renders for reduced-motion and while the loop buffers. */}
      <aside className={EVENT_PANEL_CLASS} aria-hidden="true">
        <img
          src="/brand/auth-event-poster.jpg"
          alt=""
          className={EVENT_POSTER_CLASS}
        />
        {canPlayAmbient && (
          <video
            className={EVENT_MEDIA_CLASS}
            src="/brand/hero-ambient.mp4"
            poster="/brand/auth-event-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        )}
        <div className={EVENT_SCRIM_CLASS} />
        <div className={EVENT_COPY_CLASS}>
          <p className={EVENT_STATEMENT_CLASS}>
            Trade what the world is watching.
          </p>
          <p className={EVENT_SUB_CLASS}>
            Elections, finals, premieres — every price is the crowd&apos;s live
            probability. Pick a side and see if you read it right.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <label className={FIELD_CLASS}>
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${INPUT_BASE_CLASS} ${error ? INPUT_ERROR_CLASS : ""}`}
      />
      {error && <span className={FIELD_ERROR_CLASS}>{error}</span>}
    </label>
  );
}
