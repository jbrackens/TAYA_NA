"use client";

/**
 * Button — the app's one button primitive (P1). Variants are the
 * canonical token recipes previously pasted per-file (the audit's
 * "*_CLASS" slop signature); every surface migrates onto these instead
 * of re-declaring them.
 *
 * Polymorphism uses Base UI's render prop (the layer's standard —
 * Dialog.Trigger etc. use the same mechanism): pass render={<Link …/>}
 * to keep link semantics under button styling.
 */

import { useRender } from "@base-ui-components/react/use-render";
import type { ButtonHTMLAttributes } from "react";
import { cx, variants } from "./variants";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "cta";
export type ButtonSize = "sm" | "md" | "lg" | "none";

// transition-*, font-weight, and radius live in the VARIANT, not the
// base: same-property Tailwind classes resolve by generated-CSS order,
// not class order, so the base must never set a property a variant
// overrides (cta uses rounded-md/font-semibold; the rest r-rh-md/bold).
const buttonVariant = variants<ButtonVariant>(
  "inline-flex cursor-pointer select-none items-center justify-center gap-1.5 disabled:cursor-not-allowed",
  {
    // The store/ticket CTA recipe.
    primary:
      "rounded-[var(--r-rh-md)] border-0 bg-[var(--accent)] font-bold text-white transition-[filter] hover:brightness-[1.08] disabled:opacity-55",
    // The discussion/panel action recipe.
    secondary:
      "rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] font-bold text-[var(--t1)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-55",
    // Toolbar/inline affordances: no chrome until hover.
    ghost:
      "rounded-[var(--r-rh-md)] border border-transparent bg-transparent font-bold text-[var(--t2)] transition-colors hover:border-[var(--border-1)] hover:bg-[var(--surface-2)] hover:text-[var(--t1)] disabled:opacity-55",
    // Destructive confirms (self-exclude, cancellation).
    danger:
      "rounded-[var(--r-rh-md)] border-0 bg-[var(--no)] font-bold text-white transition-[filter] hover:brightness-105 disabled:opacity-55",
    // The money button (trade ticket / store checkout): full-width,
    // self-sized — pair with size="none".
    cta: "w-full rounded-md border-0 bg-[var(--accent)] px-4 py-[14px] text-[15px] font-semibold text-[var(--ticket-cta-text)] no-underline transition-[filter,transform] duration-[120ms] [&:not(:disabled):hover]:-translate-y-px [&:not(:disabled):hover]:brightness-[1.05] disabled:opacity-[0.45] disabled:filter-none disabled:transform-none",
  },
);

const SIZE: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-xs",
  md: "min-h-10 px-4 text-xs",
  lg: "min-h-11 px-5 text-sm",
  none: "",
};

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** Replace the underlying element, e.g. render={<Link href=…/>}. */
  render?: useRender.RenderProp;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  variant = "secondary",
  size = "md",
  type = "button",
  className,
  render,
  ref,
  disabled,
  onClick,
  ...rest
}: ButtonProps) {
  // Custom render targets (e.g. render={<Link/>}) are not <button>s: the
  // `disabled` attribute is invalid there, so it translates to
  // aria-disabled + removal from the tab order + a click/pointer block.
  // (Codex review 2026-07-19: forwarding button-only props to arbitrary
  // elements left links without disabled semantics.)
  const isCustomElement = render != null;
  const disabledLinkProps =
    isCustomElement && disabled
      ? ({ "aria-disabled": true, tabIndex: -1, onClick: undefined } as const)
      : { onClick };

  return useRender({
    // The default element is a real <button> with an explicit type;
    // custom render elements own their own semantics (Link needs none).
    render: render ?? <button type={type} />,
    ref,
    props: {
      className: cx(
        buttonVariant(variant),
        SIZE[size],
        isCustomElement && disabled
          ? "pointer-events-none cursor-not-allowed opacity-55"
          : undefined,
        className,
      ),
      ...(isCustomElement ? {} : { disabled }),
      ...disabledLinkProps,
      ...rest,
    },
  });
}
