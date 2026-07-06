"use client";

import type { ComponentPropsWithoutRef } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type CardProps = ComponentPropsWithoutRef<"div">;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cx(
        "rounded-xl border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] p-5",
        className,
      )}
      {...props}
    />
  );
}

type BadgeVariant = "default" | "success" | "warning" | "danger";
type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  $variant?: BadgeVariant;
  variant?: BadgeVariant;
};

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default:
    "border-[var(--accent,#2be480)] bg-[var(--accent-soft,rgba(43,228,128,0.14))] text-[var(--focus-ring,#0e7a53)]",
  success:
    "border-[var(--yes,#71eeb8)] bg-[var(--yes-soft,rgba(113,238,184,0.18))] text-[var(--yes-text,#1a6849)]",
  warning:
    "border-[rgba(217,119,6,0.4)] bg-[rgba(217,119,6,0.12)] text-[var(--warn,#d97706)]",
  danger:
    "border-[var(--no,#ff8b6b)] bg-[var(--no-soft,rgba(255,139,107,0.16))] text-[var(--no-text,#a8472d)]",
};

export function Badge({
  className,
  $variant,
  variant,
  ...props
}: BadgeProps) {
  const resolvedVariant = $variant || variant || "default";
  return (
    <span
      className={cx(
        "inline-block rounded-[999px] border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em]",
        badgeVariantClasses[resolvedVariant],
        className,
      )}
      {...props}
    />
  );
}

type ButtonVariant = "primary" | "secondary" | "danger";
type ButtonSize = "sm" | "md" | "lg";
type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  $variant?: ButtonVariant;
  $size?: ButtonSize;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-sm",
};

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-0 bg-[var(--accent,#2be480)] text-[#003827] shadow-[0_4px_12px_rgba(43,228,128,0.18)] hover:bg-[var(--accent-lo,#1fa65e)] hover:text-white hover:shadow-[0_6px_18px_rgba(43,228,128,0.25)]",
  secondary:
    "border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] text-[var(--t1,#1a1a1a)] shadow-none hover:border-[var(--focus-ring,#0e7a53)] hover:bg-[var(--surface-2,#fcfaf5)] hover:text-[var(--focus-ring,#0e7a53)]",
  danger:
    "border-[1.5px] border-[var(--no,#ff8b6b)] bg-transparent text-[var(--no-text,#a8472d)] shadow-none hover:bg-[var(--no-soft,rgba(255,139,107,0.16))]",
};

export function Button({
  className,
  $variant,
  $size,
  variant,
  size,
  ...props
}: ButtonProps) {
  const resolvedVariant = $variant || variant || "primary";
  const resolvedSize = $size || size || "md";
  return (
    <button
      className={cx(
        "cursor-pointer rounded-lg font-['Inter',sans-serif] font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 hover:enabled:-translate-y-px",
        buttonSizeClasses[resolvedSize],
        buttonVariantClasses[resolvedVariant],
        className,
      )}
      {...props}
    />
  );
}

type InputProps = ComponentPropsWithoutRef<"input">;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cx(
        "h-10 rounded-lg border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] px-3.5 py-2.5 font-['Inter',sans-serif] text-sm text-[var(--t1,#1a1a1a)] transition-all duration-150 placeholder:text-[var(--t3,#8b8378)] focus:border-[var(--focus-ring,#0e7a53)] focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-soft,rgba(43,228,128,0.14))]",
        className,
      )}
      {...props}
    />
  );
}
