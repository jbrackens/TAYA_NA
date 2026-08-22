"use client";

import { useEffect } from "react";
import { logger } from "../lib/logger";

const shellClass =
  "flex min-h-[50vh] flex-col items-center justify-center px-5 py-10 text-center";
const iconClass = "mb-4 text-[48px] leading-none opacity-60";
const titleClass = "mb-2 text-[20px] font-bold text-[var(--t1)]";
const copyClass = "mb-6 max-w-[400px] text-[14px] leading-[1.6] text-[var(--t2)]";
const actionRowClass = "flex gap-3";
const primaryActionClass =
  "cursor-pointer rounded-[8px] border-0 bg-[var(--accent)] px-6 py-2.5 text-[14px] font-semibold text-[var(--ticket-cta-text)]";
const secondaryActionClass =
  "flex items-center rounded-[8px] border border-[var(--border-1)] bg-[var(--surface-2)] px-6 py-2.5 text-[14px] font-semibold text-[var(--t1)] no-underline";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("AccountError", "Account page error", error);
  }, [error]);

  return (
    <div className={shellClass}>
      <div className={iconClass}>⚙️</div>
      <h2 className={titleClass}>Account Error</h2>
      <p className={copyClass}>
        {error.message ||
          "We couldn't load your account information. Please try again."}
      </p>
      <div className={actionRowClass}>
        <button type="button" onClick={reset} className={primaryActionClass}>
          Try Again
        </button>
        <a href="/" className={secondaryActionClass}>
          Back to Home
        </a>
      </div>
    </div>
  );
}
