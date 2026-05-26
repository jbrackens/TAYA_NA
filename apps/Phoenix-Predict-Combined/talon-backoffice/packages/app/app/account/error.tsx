"use client";

import { useEffect } from "react";
import { logger } from "../lib/logger";

const shellClass =
  "flex min-h-[50vh] flex-col items-center justify-center px-5 py-10 text-center";
const iconClass = "mb-4 text-[48px] leading-none opacity-60";
const titleClass = "mb-2 text-[20px] font-bold text-[#f8fafc]";
const copyClass = "mb-6 max-w-[400px] text-[14px] leading-[1.6] text-[#64748b]";
const actionRowClass = "flex gap-3";
const primaryActionClass =
  "cursor-pointer rounded-[8px] border-0 bg-[linear-gradient(135deg,var(--accent),var(--accent-lo))] px-6 py-2.5 text-[14px] font-semibold text-[#04140a]";
const secondaryActionClass =
  "flex items-center rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-transparent px-6 py-2.5 text-[14px] font-semibold text-[#D3D3D3] no-underline";

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
        <button onClick={reset} className={primaryActionClass}>
          Try Again
        </button>
        <a href="/" className={secondaryActionClass}>
          Back to Home
        </a>
      </div>
    </div>
  );
}
