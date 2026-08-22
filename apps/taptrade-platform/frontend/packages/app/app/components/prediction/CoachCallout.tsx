"use client";

/**
 * CoachCallout — one onboarding beat, the tap-dot speaking a single line
 * (Figma: 02 System → Coach/Callout). Lavender = action voice. Always
 * skippable; advancing is a real button (nested-button HTML is invalid,
 * so skip is its sibling). Max three beats per flow — this is a coach
 * mark, not a tour.
 */

const WRAP_CLASS =
  "flex w-full items-start gap-2 rounded-[var(--radius-md)] border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2.5";
const ADVANCE_CLASS =
  "flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 border-0 bg-transparent p-0 text-left";
const DOT_CLASS =
  "mt-[3px] h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]";
const LINE_CLASS = "m-0 text-[13px] leading-[1.45] text-[var(--ink)]";
const STEP_CLASS =
  "font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-text)]";
const SKIP_CLASS =
  "shrink-0 cursor-pointer border-0 bg-transparent p-0 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)] underline-offset-2 hover:underline";

export interface CoachCalloutProps {
  line: string;
  step: string;
  skipLabel: string;
  onAdvance: () => void;
  onSkip: () => void;
}

export function CoachCallout({
  line,
  step,
  skipLabel,
  onAdvance,
  onSkip,
}: CoachCalloutProps) {
  return (
    <div className={WRAP_CLASS} aria-live="polite">
      <button type="button" className={ADVANCE_CLASS} onClick={onAdvance}>
        <span aria-hidden="true" className={DOT_CLASS} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={LINE_CLASS}>{line}</span>
          <span className={STEP_CLASS}>{step}</span>
        </span>
      </button>
      <button type="button" className={SKIP_CLASS} onClick={onSkip}>
        {skipLabel}
      </button>
    </div>
  );
}
