/**
 * Card — the app's surface-section primitive (P1): rounded r-rh-lg,
 * border-1, surface-1. Replaces the per-file SECTION_CLASS/CARD_CLASS
 * recipes. Server-component-safe (no hooks, no "use client").
 */

import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cx, variants } from "./variants";

export type CardPadding = "none" | "md" | "lg";

const cardPadding = variants<CardPadding>(
  "rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)]",
  {
    none: "",
    md: "p-5",
    lg: "px-6 py-6 max-[720px]:px-5",
  },
);

export interface CardProps extends HTMLAttributes<HTMLElement> {
  padding?: CardPadding;
  /** Render as <section> (default) or a plain <div>. */
  as?: "section" | "div" | "article" | "aside";
}

export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { padding = "lg", as: Tag = "section", className, ...rest },
  ref,
) {
  return (
    <Tag
      // eslint-free repo: the ref cast is safe — all four tags are HTMLElement.
      ref={ref as React.Ref<never>}
      className={cx(cardPadding(padding), className)}
      {...rest}
    />
  );
});
