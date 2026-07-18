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

const FIELD_CLASS =
  "rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-2.5 text-sm leading-[1.5] text-[var(--t1)] outline-none placeholder:text-[var(--t3)] focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55";

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
