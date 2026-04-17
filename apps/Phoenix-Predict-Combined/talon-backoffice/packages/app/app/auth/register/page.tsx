"use client";

/**
 * RegisterPage — 4-step wizard on Predict design tokens.
 *
 * Keeps the original KYC shape (account, personal, address, terms) but
 * renders on the Predict auth shell. Step progress bar uses --accent.
 */

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { register as registerUser } from "../../lib/api";

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  acceptTerms: boolean;
}

type Errors = Partial<Record<keyof FormData, string>>;

const EMPTY_FORM: FormData = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  acceptTerms: false,
};

const TOTAL_STEPS = 4;
const STEP_TITLES = ["Account", "Personal", "Address", "Terms"];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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
        else if (form.password.length < 8)
          next.password = "At least 8 characters";
        if (!form.confirmPassword) next.confirmPassword = "Required";
        else if (form.password !== form.confirmPassword)
          next.confirmPassword = "Passwords don't match";
      }
      if (currentStep === 2) {
        if (!form.firstName.trim()) next.firstName = "Required";
        if (!form.lastName.trim()) next.lastName = "Required";
        if (!form.dateOfBirth) next.dateOfBirth = "Required";
        if (!form.phone.trim()) next.phone = "Required";
      }
      if (currentStep === 3) {
        if (!form.street.trim()) next.street = "Required";
        if (!form.city.trim()) next.city = "Required";
        if (!form.state.trim()) next.state = "Required";
        if (!form.zip.trim()) next.zip = "Required";
        if (!form.country.trim()) next.country = "Required";
      }
      if (currentStep === 4) {
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
    const v = validate(4);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await registerUser({
        username: form.username,
        email: form.email,
        password: form.password,
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
        date_of_birth: form.dateOfBirth,
        address: {
          street: form.street,
          city: form.city,
          state: form.state,
          zip: form.zip,
          country: form.country,
        },
      });
      setSuccessMessage("Account created. Redirecting to sign-in…");
      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Registration failed",
      );
    } finally {
      setSubmitting(false);
    }
  }, [form, validate]);

  const progress = useMemo(() => (step / TOTAL_STEPS) * 100, [step]);

  return (
    <div className="ra-shell">
      <Styles />
      <div className="ra-card">
        <header className="ra-head">
          <span className="ra-eyebrow">
            Step {step} of {TOTAL_STEPS}
          </span>
          <h1 className="ra-title">Create your account</h1>
          <p className="ra-sub">{STEP_TITLES[step - 1]}</p>
        </header>

        <div className="ra-progress" aria-hidden="true">
          <div className="ra-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {errorMessage && <div className="ra-banner error">{errorMessage}</div>}
        {successMessage && (
          <div className="ra-banner success">{successMessage}</div>
        )}

        {step === 1 && (
          <div className="ra-form">
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
              placeholder="At least 8 characters"
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
          <div className="ra-form">
            <Field
              label="First name"
              value={form.firstName}
              onChange={(v) => update("firstName", v)}
              error={errors.firstName}
              autoComplete="given-name"
            />
            <Field
              label="Last name"
              value={form.lastName}
              onChange={(v) => update("lastName", v)}
              error={errors.lastName}
              autoComplete="family-name"
            />
            <Field
              label="Date of birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(v) => update("dateOfBirth", v)}
              error={errors.dateOfBirth}
              autoComplete="bday"
            />
            <Field
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(v) => update("phone", v)}
              placeholder="+1 555 000 1234"
              error={errors.phone}
              autoComplete="tel"
            />
          </div>
        )}

        {step === 3 && (
          <div className="ra-form">
            <Field
              label="Street"
              value={form.street}
              onChange={(v) => update("street", v)}
              placeholder="123 Main St"
              error={errors.street}
              autoComplete="address-line1"
            />
            <div className="ra-row">
              <Field
                label="City"
                value={form.city}
                onChange={(v) => update("city", v)}
                error={errors.city}
                autoComplete="address-level2"
              />
              <Field
                label="State"
                value={form.state}
                onChange={(v) => update("state", v)}
                error={errors.state}
                autoComplete="address-level1"
              />
            </div>
            <div className="ra-row">
              <Field
                label="ZIP"
                value={form.zip}
                onChange={(v) => update("zip", v)}
                error={errors.zip}
                autoComplete="postal-code"
              />
              <Field
                label="Country"
                value={form.country}
                onChange={(v) => update("country", v)}
                error={errors.country}
                autoComplete="country"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="ra-form">
            <div className="ra-terms">
              <h3>Terms and conditions</h3>
              <p>
                By creating a Predict account you agree to our Terms of Service
                and Privacy Policy. You must be 18 or older to trade binary
                contracts on this platform.
              </p>
              <p>
                You agree to keep your account information accurate and to trade
                responsibly. Predict is committed to providing tools and
                resources for responsible participation.
              </p>
            </div>

            <label className="ra-check">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={(e) => update("acceptTerms", e.target.checked)}
              />
              <span>I agree to the Terms of Service and Privacy Policy</span>
            </label>
            {errors.acceptTerms && (
              <div className="ra-field-error">{errors.acceptTerms}</div>
            )}

            <div className="ra-summary">
              <span className="ra-summary-eyebrow">Account summary</span>
              <dl>
                <div>
                  <dt>Username</dt>
                  <dd className="mono">{form.username}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{form.email}</dd>
                </div>
                <div>
                  <dt>Name</dt>
                  <dd>
                    {form.firstName} {form.lastName}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        <div className="ra-actions">
          <button
            type="button"
            onClick={onPrev}
            disabled={step === 1 || submitting}
            className="ra-btn ghost"
          >
            Back
          </button>
          <button
            type="button"
            onClick={step === TOTAL_STEPS ? onSubmit : onNext}
            disabled={submitting}
            className="ra-btn primary"
          >
            {submitting
              ? "Processing…"
              : step === TOTAL_STEPS
                ? "Create account"
                : "Continue"}
          </button>
        </div>

        <footer className="ra-foot">
          Already have an account?{" "}
          <Link href="/auth/login" className="ra-link-accent">
            Sign in
          </Link>
        </footer>
      </div>
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
    <label className="ra-field">
      <span className="ra-field-label">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`ra-input ${error ? "ra-input-error" : ""}`}
      />
      {error && <span className="ra-field-error">{error}</span>}
    </label>
  );
}

function Styles() {
  return (
    <style>{`
      .ra-shell {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
      }
      .ra-card {
        width: 100%;
        max-width: 500px;
        background: var(--s1);
        border: 1px solid var(--b1);
        border-radius: var(--r-lg);
        padding: 32px 32px 26px;
        box-shadow: 0 28px 60px rgba(0,0,0,0.45);
      }
      .ra-head { text-align: center; margin-bottom: 16px; }
      .ra-eyebrow {
        display: inline-block;
        padding: 3px 10px;
        margin-bottom: 10px;
        background: var(--accent-soft);
        border: 1px solid rgba(34,211,238,0.3);
        color: var(--accent);
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .ra-title {
        margin: 0 0 4px;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--t1);
      }
      .ra-sub {
        margin: 0;
        font-size: 13px;
        color: var(--t3);
      }

      .ra-progress {
        position: relative;
        height: 4px;
        background: var(--s2);
        border-radius: 999px;
        overflow: hidden;
        margin-bottom: 22px;
      }
      .ra-progress-fill {
        position: absolute;
        inset: 0 auto 0 0;
        background: linear-gradient(90deg, var(--accent), var(--accent-hi));
        border-radius: inherit;
        box-shadow: 0 0 14px rgba(34,211,238,0.5);
        transition: width 0.3s ease;
      }

      .ra-banner {
        padding: 10px 12px;
        border-radius: var(--r-sm);
        font-size: 13px;
        margin-bottom: 14px;
      }
      .ra-banner.error {
        background: rgba(248,113,113,0.1);
        border: 1px solid rgba(248,113,113,0.3);
        color: var(--no);
      }
      .ra-banner.success {
        background: rgba(52,211,153,0.1);
        border: 1px solid rgba(52,211,153,0.3);
        color: var(--yes);
      }

      .ra-form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .ra-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .ra-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .ra-field-label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
      }
      .ra-input {
        background: var(--s2);
        border: 1px solid var(--b1);
        border-radius: var(--r-sm);
        padding: 10px 12px;
        font-family: inherit;
        font-size: 14px;
        color: var(--t1);
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .ra-input::placeholder { color: var(--t4); }
      .ra-input:focus {
        border-color: var(--accent);
        box-shadow: var(--accent-glow);
      }
      .ra-input-error { border-color: var(--no); }
      .ra-field-error {
        font-size: 11px;
        color: var(--no);
      }

      .ra-terms {
        background: var(--s2);
        border: 1px solid var(--b1);
        border-radius: var(--r-sm);
        padding: 14px 16px;
        max-height: 220px;
        overflow-y: auto;
      }
      .ra-terms h3 {
        margin: 0 0 8px;
        font-size: 14px;
        font-weight: 700;
        color: var(--t1);
      }
      .ra-terms p {
        margin: 0 0 10px;
        font-size: 12px;
        line-height: 1.55;
        color: var(--t2);
      }
      .ra-terms p:last-child { margin-bottom: 0; }

      .ra-check {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        color: var(--t1);
        cursor: pointer;
      }
      .ra-check input {
        width: 16px;
        height: 16px;
        accent-color: var(--accent);
      }

      .ra-summary {
        background: var(--s2);
        border: 1px solid var(--b1);
        border-radius: var(--r-sm);
        padding: 12px 14px;
      }
      .ra-summary-eyebrow {
        display: block;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
        margin-bottom: 8px;
      }
      .ra-summary dl {
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .ra-summary dl > div {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        font-size: 12px;
      }
      .ra-summary dt { color: var(--t3); }
      .ra-summary dd { margin: 0; color: var(--t1); }

      .ra-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }
      .ra-btn {
        flex: 1;
        padding: 11px 14px;
        border: 1px solid transparent;
        border-radius: var(--r-sm);
        font-family: inherit;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.02em;
        cursor: pointer;
        transition: all 0.15s;
      }
      .ra-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .ra-btn.ghost {
        background: transparent;
        color: var(--t2);
        border-color: var(--b2);
      }
      .ra-btn.ghost:hover:not(:disabled) {
        background: var(--s2);
        color: var(--t1);
      }
      .ra-btn.primary {
        background: var(--accent);
        color: #06222b;
        box-shadow: var(--accent-glow);
      }
      .ra-btn.primary:hover:not(:disabled) { background: var(--accent-hi); }

      .ra-foot {
        padding-top: 14px;
        margin-top: 18px;
        border-top: 1px solid var(--b1);
        text-align: center;
        font-size: 13px;
        color: var(--t2);
      }
      .ra-link-accent {
        color: var(--accent);
        text-decoration: none;
        font-weight: 600;
      }
      .ra-link-accent:hover { color: var(--accent-hi); }
    `}</style>
  );
}
