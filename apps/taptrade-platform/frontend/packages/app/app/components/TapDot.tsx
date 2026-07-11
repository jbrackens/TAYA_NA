"use client";

/**
 * TapDot — the brand's kinetic signature as a loader.
 *
 * One mint dot tapping: it lifts, drops onto the baseline with a slight
 * squash, and a hairline ring blooms at contact — the "tap that lands the
 * trade" from the brand mark, animated. Used wherever a surface waits on
 * data instead of text-only "Loading…" strings or anonymous skeleton
 * blocks. Keyframes live in globals.css (`tap-dot`, `tap-dot-ring`) and
 * collapse under prefers-reduced-motion via the global override.
 */

import { useTranslation } from "react-i18next";

export default function TapDot({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const { t } = useTranslation("common");
  return (
    <span
      role="status"
      aria-label={label ?? t("LOADING", "Loading")}
      className={`inline-flex flex-col items-center gap-3.5 ${className}`}
    >
      <span className="relative inline-flex h-6 w-6 items-end justify-center">
        <span className="tap-dot-ring absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full" />
        <span className="tap-dot h-2.5 w-2.5 rounded-full bg-[var(--brand-period)]" />
      </span>
      {label ? (
        <span className="text-[13px] font-medium text-[var(--t3)]">
          {label}
        </span>
      ) : null}
    </span>
  );
}
