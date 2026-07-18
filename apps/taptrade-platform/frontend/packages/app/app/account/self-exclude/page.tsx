"use client";

import type React from "react";
import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Lock,
  Clock,
  Coins,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/ToastProvider";
import {
  selfExclude,
  type SelfExcludeResponse,
} from "../../lib/api/compliance-client";
import { FEATURE_RG } from "../../lib/features";

type Step = "warning" | "form" | "confirm" | "success";
type Duration = "1" | "5" | "lifetime";

const pageClass = "mx-auto max-w-[700px] px-4 py-6";
const cardClass =
  "mb-6 rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-8";
const descClass = "mb-6 text-[13px] text-[var(--t3)]";
const fieldClass = "flex flex-col gap-2";
const labelClass = "text-[13px] font-semibold text-[var(--t2)]";
const actionsClass = "mt-6 flex gap-3 max-[640px]:flex-col-reverse";
const buttonBaseClass =
  "flex-1 cursor-pointer rounded-[var(--r-rh-md)] border px-5 py-3 text-center text-sm font-bold no-underline transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50";
const primaryButtonClass = `${buttonBaseClass} border-transparent bg-[var(--accent)] text-[#04140a] hover:-translate-y-px hover:brightness-105`;
const secondaryButtonClass = `${buttonBaseClass} border-[var(--border-1)] bg-[var(--surface-2)] text-[var(--t1)] hover:border-[var(--accent)] hover:text-[var(--accent)]`;
const dangerButtonClass = `${buttonBaseClass} border-transparent bg-[var(--no)] text-white hover:brightness-105`;

function durationButtonClass(active: boolean) {
  return `flex-1 cursor-pointer rounded-[var(--r-rh-md)] border px-4 py-3 text-center text-[13px] font-semibold transition-all duration-150 ${
    active
      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
      : "border-[var(--border-1)] bg-[var(--surface-2)] text-[var(--t2)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
  }`;
}

export default function SelfExcludePage() {
  if (!FEATURE_RG) notFound();
  return <SelfExcludePageContent />;
}

function SelfExcludePageContent() {
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
    <div className={pageClass}>
      <div className="mb-8 text-center">
        <h1 className="mb-1 text-[28px] font-extrabold text-[var(--t1)]">
          Self-Exclusion
        </h1>
        <p className="text-sm text-[var(--t3)]">
          Permanently exclude yourself from your account
        </p>
      </div>

      {/* Warning Step */}
      {step === "warning" && (
        <div className={`${cardClass} border-[var(--no-text)]`}>
          <div className="mb-4 text-center text-5xl">
            <AlertTriangle
              size={48}
              strokeWidth={1.5}
              className="mx-auto text-[var(--no)]"
            />
          </div>
          <h2 className="mb-2 text-xl font-bold text-[var(--t1)]">
            Important Notice
          </h2>
          <div className="flex flex-col gap-5">
            <p className="text-sm leading-relaxed text-[var(--t1)]">
              Self-exclusion is a permanent decision that will close your
              account immediately.
            </p>

            <div className="flex flex-col gap-3">
              <Consequence
                icon={<Ban size={20} strokeWidth={1.75} />}
                title="Account Closure"
                desc="Your account will be completely blocked and cannot be reopened"
              />
              <Consequence
                icon={<Coins size={20} strokeWidth={1.75} />}
                title="Point Handling"
                desc="Any remaining gameplay points will be locked or cleared according to our policy"
              />
              <Consequence
                icon={<Lock size={20} strokeWidth={1.75} />}
                title="No Access"
                desc="You will not be able to place orders or use any account features"
              />
              <Consequence
                icon={<Clock size={20} strokeWidth={1.75} />}
                title={
                  duration === "lifetime"
                    ? "Permanent Exclusion"
                    : `${durationLabel} Exclusion`
                }
                desc={
                  duration === "lifetime"
                    ? "This is a permanent action with no exceptions"
                    : `Your account will be excluded for ${durationLabel.toLowerCase()}`
                }
              />
            </div>

            <div className="rounded-[var(--r-rh-md)] border border-[var(--border-2)] bg-[var(--surface-2)] p-4">
              <strong className="mb-2 block text-[13px] text-[var(--t1)]">
                Need Help?
              </strong>
              <p className="mb-2 text-xs text-[var(--t2)]">
                If you're struggling with gambling, please contact our support
                team or visit responsible gaming resources:
              </p>
              <ul className="m-0 pl-5 text-xs text-[var(--t2)]">
                <li className="mb-1">
                  National Problem Gambling Helpline: 1-800-GAMBLER
                </li>
                <li className="mb-1">
                  Gamblers Anonymous: www.gamblersanonymous.org
                </li>
              </ul>
            </div>
          </div>

          <div className={actionsClass}>
            <Link href="/account" className={secondaryButtonClass}>
              Cancel
            </Link>
            <button className={primaryButtonClass} onClick={handleProceed}>
              I Understand, Continue
            </button>
          </div>
        </div>
      )}

      {/* Form Step */}
      {step === "form" && (
        <div className={cardClass}>
          <h2 className="mb-2 text-xl font-bold text-[var(--t1)]">
            Self-Exclusion Request
          </h2>
          <p className={descClass}>
            Please provide a reason for your self-exclusion request
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className={fieldClass}>
              <label className={labelClass}>Exclusion Duration</label>
              <div className="flex flex-row gap-2.5">
                <button
                  type="button"
                  className={durationButtonClass(duration === "1")}
                  onClick={() => setDuration("1")}
                >
                  1 Year
                </button>
                <button
                  type="button"
                  className={durationButtonClass(duration === "5")}
                  onClick={() => setDuration("5")}
                >
                  5 Years
                </button>
                <button
                  type="button"
                  className={durationButtonClass(duration === "lifetime")}
                  onClick={() => setDuration("lifetime")}
                >
                  Lifetime
                </button>
              </div>
            </div>

            <div className={fieldClass}>
              <label className={labelClass}>Reason for Self-Exclusion</label>
              <textarea
                className="resize-y rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] px-[14px] py-3 text-[13px] text-[var(--t1)] outline-none transition-colors duration-150 focus:border-[var(--accent)]"
                value={reason}
                onChange={handleReasonChange}
                placeholder="Please tell us why you want to self-exclude (optional but helpful)"
                rows={6}
              />
              <div className="text-[11px] text-[var(--t3)]">
                {reason.length} characters
              </div>
            </div>

            <div className="rounded-[var(--r-rh-md)] bg-[var(--surface-2)] px-4 py-3">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  className="mt-0.5 cursor-pointer accent-[var(--accent)]"
                  type="checkbox"
                  checked={confirmed}
                  onChange={handleConfirmToggle}
                />
                <span className="text-[13px] leading-snug text-[var(--t2)]">
                  I understand that self-exclusion is permanent and my account
                  cannot be reopened
                </span>
              </label>
            </div>

            <div className={actionsClass}>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setStep("warning")}
              >
                Back
              </button>
              <button
                type="submit"
                className={primaryButtonClass}
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
        <div className={`${cardClass} text-center`}>
          <div className="mb-4 text-5xl">
            <ShieldCheck
              size={48}
              strokeWidth={1.5}
              className="mx-auto text-[#fbbf24]"
            />
          </div>
          <h2 className="mb-2 text-xl font-bold text-[var(--t1)]">
            Confirm Self-Exclusion
          </h2>
          <p className={descClass}>
            Please review your request before proceeding
          </p>

          <div className="my-6 flex flex-col gap-4">
            <ReviewItem label="Duration" value={durationLabel} />
            <ReviewItem label="Reason" value={reason} />

            <div className="flex items-center gap-2 rounded-[var(--r-rh-md)] border border-[rgba(255,155,107,0.2)] bg-[rgba(255,155,107,0.08)] px-4 py-3 text-[13px] font-semibold text-[var(--no-text)]">
              <AlertTriangle size={16} strokeWidth={2} className="shrink-0" />
              This action cannot be undone. Your account will be permanently
              closed.
            </div>
          </div>

          <div className={actionsClass}>
            <button
              className={secondaryButtonClass}
              onClick={() => setStep("form")}
            >
              Back to Edit
            </button>
            <button
              className={dangerButtonClass}
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
        <div className={`${cardClass} border-[var(--accent)] text-center`}>
          <div className="mb-4 text-[56px]">
            <CheckCircle2
              size={56}
              strokeWidth={1.5}
              className="mx-auto text-[var(--accent)]"
            />
          </div>
          <h2 className="mb-2 text-xl font-bold text-[var(--t1)]">
            Self-Exclusion Confirmed
          </h2>
          <p className={descClass}>
            Your account has been successfully self-excluded
          </p>

          <div className="my-6 rounded-[var(--r-rh-md)] bg-[var(--surface-2)] p-5">
            <DetailItem label="Status:" value={result.status} />
            <DetailItem
              label="Excluded Until:"
              value={new Date(result.excludedUntil).toLocaleDateString()}
            />
          </div>

          <div className="my-4 rounded-[var(--r-rh-md)] border border-[var(--border-2)] bg-[var(--accent-soft)] p-4">
            <strong className="mb-2 block text-sm text-[var(--accent)]">
              Your account is now permanently closed.
            </strong>
            <p className="text-[13px] text-[var(--t2)]">
              If you need support or have questions about responsible gaming,
              please contact us.
            </p>
          </div>

          <div className={actionsClass}>
            <a href="/" className={primaryButtonClass}>
              Return to Home
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function Consequence({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  desc: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-[var(--r-rh-md)] border-l-[3px] border-l-[var(--no)] bg-[var(--surface-2)] p-3">
      <span className="shrink-0 text-xl text-[var(--no)]">{icon}</span>
      <div>
        <strong className="mb-0.5 block text-[13px] text-[var(--t1)]">
          {title}
        </strong>
        <p className="m-0 text-xs text-[var(--t3)]">{desc}</p>
      </div>
    </div>
  );
}

function ReviewItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--r-rh-md)] bg-[var(--surface-2)] p-4 text-left">
      <div className="mb-1 text-xs font-semibold text-[var(--t3)]">{label}</div>
      <div className="break-words text-sm text-[var(--t1)]">{value}</div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between border-b border-[var(--border-1)] py-2 text-[13px] last:border-b-0">
      <span className="font-semibold text-[var(--t3)]">{label}</span>
      <span className="font-bold text-[var(--t1)]">{value}</span>
    </div>
  );
}
