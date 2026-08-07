"use client";

/**
 * InviteRibbon — the first-trade invitation, sitting IN the feed
 * (Figma: 02 System → Banner/Invite). Slim and dismissible; browsing
 * stays wall-free per the prices-are-public doctrine. Dismissal is
 * permanent per device (onboarding.ts).
 */

const WRAP_CLASS =
  "flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-[var(--lime-text)] bg-[var(--lime-tint)] py-2.5 pl-3.5 pr-2.5";
const LINE_CLASS =
  "m-0 min-w-0 flex-1 text-[13px] leading-[1.45] text-[var(--ink-on-lime)]";
const CTA_CLASS =
  "shrink-0 cursor-pointer rounded-[var(--radius-sm)] border-0 bg-[var(--lime)] px-3 py-[7px] text-[12px] font-semibold text-[var(--ink-on-lime)]";
const DISMISS_CLASS =
  "shrink-0 cursor-pointer border-0 bg-transparent px-1.5 text-[15px] leading-none text-[var(--ink-3)]";

export interface InviteRibbonProps {
  line: string;
  ctaLabel: string;
  dismissLabel: string;
  onStart: () => void;
  onDismiss: () => void;
}

export function InviteRibbon({
  line,
  ctaLabel,
  dismissLabel,
  onStart,
  onDismiss,
}: InviteRibbonProps) {
  return (
    <div className={WRAP_CLASS}>
      <p className={LINE_CLASS}>{line}</p>
      <button type="button" className={CTA_CLASS} onClick={onStart}>
        {ctaLabel}
      </button>
      <button
        type="button"
        className={DISMISS_CLASS}
        onClick={onDismiss}
        aria-label={dismissLabel}
      >
        ×
      </button>
    </div>
  );
}
