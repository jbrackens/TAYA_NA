"use client";

/**
 * Input + Textarea — the app's text-entry primitives (P1). Token recipe
 * from the discussion composer / ticket amount fields. Number-ish inputs
 * should pass inputMode="numeric" so mobile keyboards cooperate (and the
 * E2E journeys select on it).
 */

import { forwardRef } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "./variants";

// focus-visible ring: keyboard-only affordance from the auth screens
// (P2), promoted to the primitive. aria-invalid drives the error border
// (attribute selector outranks the base border class, so the override
// is deterministic — call-site border classNames are not).
const FIELD_CLASS =
  "rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-2.5 text-sm leading-[1.5] text-[var(--t1)] outline-none transition-[background-color,border-color,box-shadow,color] placeholder:text-[var(--t3)] focus:border-[var(--accent)] focus-visible:shadow-[0_0_0_2px_var(--focus-ring)] aria-invalid:border-[var(--brand-dark)] disabled:cursor-not-allowed disabled:border-[var(--inert-border)] disabled:bg-[var(--inert-fill)] disabled:text-[var(--inert-label)] disabled:opacity-100";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx(FIELD_CLASS, className)} {...rest} />;
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cx(FIELD_CLASS, "min-h-[92px] resize-y", className)}
        {...rest}
      />
    );
  },
);
