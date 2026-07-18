"use client";

/**
 * Button — the app's one button primitive (P1). Variants are the
 * canonical token recipes previously pasted per-file (the audit's
 * "*_CLASS" slop signature); every surface migrates onto these instead
 * of re-declaring them.
 *
 * Plain <button> under the hood — Base UI's useRender ships a button
 * part, but a native element with an explicit type covers every current
 * call site without another layer.
 */

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cx, variants } from "./variants";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const buttonVariant = variants<ButtonVariant>(
  "inline-flex cursor-pointer select-none items-center justify-center gap-1.5 rounded-[var(--r-rh-md)] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55",
  {
    // The store/ticket CTA recipe.
    primary:
      "border-0 bg-[var(--accent)] text-white transition-[filter] hover:brightness-[1.08]",
    // The discussion/panel action recipe.
    secondary:
      "border border-[var(--border-1)] bg-[var(--surface-2)] text-[var(--t1)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
    // Toolbar/inline affordances: no chrome until hover.
    ghost:
      "border border-transparent bg-transparent text-[var(--t2)] hover:border-[var(--border-1)] hover:bg-[var(--surface-2)] hover:text-[var(--t1)]",
    // Destructive confirms (self-exclude, cancellation).
    danger:
      "border-0 bg-[var(--no)] text-white transition-[filter] hover:brightness-105",
  },
);

const SIZE: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-xs",
  md: "min-h-10 px-4 text-xs",
  lg: "min-h-11 px-5 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "secondary", size = "md", type = "button", className, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx(buttonVariant(variant), SIZE[size], className)}
        {...rest}
      />
    );
  },
);
