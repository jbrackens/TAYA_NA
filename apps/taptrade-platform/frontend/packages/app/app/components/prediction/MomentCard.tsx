"use client";

/**
 * MomentCard — one event on the HAPPENING NOW strip (Moments IA).
 * Figma: "TapTrade Design" → 02 System → Card/Moment.
 *
 * States only provable facts: majority category, computed close window,
 * member count, and the headline market's real price. Clicking selects the
 * headline market so the trade preview follows, same as row selection.
 */

import type { PredictionMarket } from "@taptrade-ui/api-client/src/prediction-types";

const CARD_CLASS =
  "flex min-w-0 flex-1 basis-0 cursor-pointer flex-col gap-2 rounded-[var(--radius-md)] border bg-[var(--card)] p-3.5 text-left transition-colors duration-[120ms]";
const CARD_TONE_CLASS = "border-[var(--hairline)] hover:border-[var(--hairline-strong)]";
const CARD_SELECTED_CLASS = "border-[var(--lime-text)] bg-[var(--lime-wash)]";
const META_CLASS =
  "font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--lime-text)]";
const TITLE_CLASS =
  "m-0 line-clamp-2 text-[14px] font-semibold leading-[1.35] text-[var(--ink)]";
const HEADLINE_CLASS =
  "flex items-center gap-2 font-mono text-[11px] text-[var(--ink-3)] [font-variant-numeric:tabular-nums]";
const PRICE_CLASS = "text-[14px] font-semibold text-[var(--ink)]";
const COUNT_CLASS =
  "font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--lime-text)]";

export interface MomentCardProps {
  meta: string;
  title: string;
  /** Second-loudest member of the event — the "and also…" line. */
  secondary: PredictionMarket;
  countLabel: string;
  selected: boolean;
  onSelect: () => void;
}

export function MomentCard({
  meta,
  title,
  secondary,
  countLabel,
  selected,
  onSelect,
}: MomentCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`${CARD_CLASS} ${selected ? CARD_SELECTED_CLASS : CARD_TONE_CLASS}`}
      aria-pressed={selected}
    >
      <span className={META_CLASS}>{meta}</span>
      <span className={TITLE_CLASS}>{title}</span>
      <span className={HEADLINE_CLASS}>
        <span className={PRICE_CLASS}>{secondary.yesPricePoints}¢</span>
        <span className="min-w-0 truncate">{secondary.title}</span>
      </span>
      <span className={COUNT_CLASS}>{countLabel}</span>
    </button>
  );
}
