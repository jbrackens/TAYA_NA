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
import { cloneElement, useEffect, useRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { logger } from "../../lib/logger";
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
const BUTTON_FOCUS_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]";
const BUTTON_INERT_CLASS =
  "disabled:border disabled:border-[var(--inert-border)] disabled:bg-[var(--inert-fill)] disabled:text-[var(--inert-label)] disabled:opacity-100 disabled:filter-none";

const buttonVariant = variants<ButtonVariant>(
  `inline-flex cursor-pointer select-none items-center justify-center gap-1.5 disabled:cursor-not-allowed ${BUTTON_FOCUS_CLASS}`,
  {
    // Purple is the generic action color. Foreground remains theme-scoped
    // so the token can keep its AA contrast contract in every route.
    primary:
      `rounded-[var(--r-rh-md)] border-0 bg-[var(--accent)] font-bold text-[var(--ticket-cta-text)] transition-[filter,transform] [&:not(:disabled):hover]:brightness-[1.05] [&:not(:disabled):active]:translate-y-px [&:not(:disabled):active]:brightness-[0.96] ${BUTTON_INERT_CLASS}`,
    // The discussion/panel action recipe.
    // Hover elevates the purple action channel without changing the
    // component's neutral default state.
    secondary:
      `rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] font-bold text-[var(--t1)] transition-[background-color,border-color,color,transform] [&:not(:disabled):hover]:border-[var(--accent)] [&:not(:disabled):hover]:bg-[var(--accent-soft)] [&:not(:disabled):hover]:text-[var(--accent-text)] [&:not(:disabled):active]:translate-y-px ${BUTTON_INERT_CLASS}`,
    // Toolbar/inline affordances: no chrome until hover.
    ghost:
      `rounded-[var(--r-rh-md)] border border-transparent bg-transparent font-bold text-[var(--t2)] transition-[background-color,border-color,color,transform] [&:not(:disabled):hover]:border-[var(--border-1)] [&:not(:disabled):hover]:bg-[var(--surface-2)] [&:not(:disabled):hover]:text-[var(--t1)] [&:not(:disabled):active]:translate-y-px ${BUTTON_INERT_CLASS}`,
    // Destructive confirms use the deep brand anchor. Red remains reserved
    // for market NO positions and negative market outcomes.
    danger:
      `rounded-[var(--r-rh-md)] border-0 bg-[var(--brand-dark)] font-bold text-[var(--on-brand)] transition-[filter,transform] [&:not(:disabled):hover]:brightness-[1.05] [&:not(:disabled):active]:translate-y-px [&:not(:disabled):active]:brightness-[0.96] ${BUTTON_INERT_CLASS}`,
    // The money button (trade ticket / store checkout): full-width,
    // self-sized — pair with size="none".
    //
    // Disabled uses the neutral inert treatment: explicit surface —
    // --inert-fill / --inert-border /
    // --inert-label — with NO opacity and NO filter. The old
    // disabled:opacity-[0.45] put the label near 2.4:1 on the accent
    // fill, making every blocked trade state unreadable. The disabled:
    // classes beat the base border-0/bg/text by :disabled specificity,
    // not by class order (see the class-order note above).
    cta: "w-full min-h-[52px] rounded-[var(--radius-md)] border-0 bg-[var(--accent)] px-4 py-[14px] text-[15px] font-semibold text-[var(--ticket-cta-text)] no-underline transition-[filter,transform] duration-[120ms] [&:not(:disabled):hover]:-translate-y-px [&:not(:disabled):hover]:brightness-[1.05] [&:not(:disabled):active]:translate-y-0 [&:not(:disabled):active]:brightness-[0.96] disabled:border disabled:border-[var(--inert-border)] disabled:bg-[var(--inert-fill)] disabled:text-[var(--inert-label)] disabled:opacity-100 disabled:filter-none disabled:transform-none",
  },
);

// The inert cta recipe for the CUSTOM-RENDER path. A non-button render
// target (e.g. <a>) never matches :disabled, so the disabled: classes in
// the variant string are dead there — and appending same-property
// arbitrary-value utilities (bg-[…] over bg-[…]) would resolve by
// generated-CSS order, not class order. So the disabled custom cta
// REPLACES the variant recipe outright with the inert surface. Layout
// classes mirror the cta variant; state classes carry the §3 treatment.
const CTA_INERT_CUSTOM =
  "w-full rounded-md border border-[var(--inert-border)] bg-[var(--inert-fill)] px-4 py-[14px] text-[15px] font-semibold text-[var(--inert-label)] no-underline";

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
  /**
   * Replace the underlying element, e.g. render={<Link href=…/>}.
   * Element form only (not Base UI's function form): the disabled
   * contract below is enforced by cloning the element, which requires
   * owning its props.
   *
   * COOPERATIVE CONTRACT (inherent to React composition — the same
   * holds for Radix asChild and Base UI render everywhere): when the
   * render target is a COMPONENT, it must forward received props to its
   * underlying element. React cannot force a component to honor props
   * it discards; a dev-mode runtime check below detects and reports
   * violations against the rendered DOM node.
   */
  render?: React.ReactElement<Record<string, unknown>>;
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
  // aria-disabled + removal from the tab order + activation blocking.
  // Enforcement is by CLONING the render element with those props forced
  // (Codex re-review 2026-07-19 round 3): Base UI merges the render
  // element's own props over the hook's, so semantics attached only at
  // the hook layer could be overridden by props on the render element
  // itself — clone props replace the element's own, including its
  // original onClick, which the guard supersedes entirely while
  // disabled. The guard still preventDefault()s for any handler Base UI
  // composes around it (Next <Link> bails on defaultPrevented).
  const isCustomElement = render != null;
  const blockActivation = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const disabledCustomProps =
    isCustomElement && disabled
      ? ({
          "aria-disabled": true,
          tabIndex: -1,
          onClick: blockActivation,
        } as const)
      : null;
  const effectiveRender =
    render != null && disabledCustomProps
      ? cloneElement(render, { ...disabledCustomProps })
      : render;

  // Dev-mode cooperative-contract check: cloning seals HOST render
  // elements, but a render COMPONENT could drop the forced props on the
  // floor before they reach its DOM. That cannot be prevented in
  // React's model — so it is detected. Two violation shapes (Codex
  // re-review round 4): a component that drops the REF leaves the node
  // null — the contract requires forwarding the ref, so null-while-
  // mounted IS the violation, not a blind spot; a component that
  // forwards the ref but cherry-picks props is caught by checking BOTH
  // enforced attributes on the real DOM node.
  const nodeRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!isCustomElement || !disabled) return;
    const violation = checkDisabledRenderContract(nodeRef.current);
    if (violation) {
      logger.error("ui/Button", violation.message, violation.data);
    }
    // render?.type keeps the check live across TARGET SWAPS (a compliant
    // target replaced by a violating one while still disabled) without
    // re-running on every render — element objects are new each render,
    // but the target's component identity is stable until it changes.
  }, [isCustomElement, disabled, render?.type]);

  return useRender({
    // The default element is a real <button> with an explicit type;
    // custom render elements own their own semantics (Link needs none).
    render: effectiveRender ?? <button type={type} />,
    ref: ref != null ? [ref, nodeRef] : nodeRef,
    props: {
      className: cx(
        // Disabled custom cta swaps to the inert recipe (see
        // CTA_INERT_CUSTOM); other variants keep the opacity treatment
        // until their spec lands.
        isCustomElement && disabled && variant === "cta"
          ? CTA_INERT_CUSTOM
          : buttonVariant(variant),
        SIZE[size],
        isCustomElement && disabled
          ? variant === "cta"
            ? "pointer-events-none cursor-not-allowed"
            : "pointer-events-none cursor-not-allowed opacity-55"
          : undefined,
        className,
      ),
      onClick,
      ...(isCustomElement ? {} : { disabled }),
      ...rest,
      ...(disabledCustomProps ?? {}),
    },
  });
}

/**
 * Pure contract check behind the dev-mode detector (exported for direct
 * unit coverage — react-test-renderer cannot attach Base UI's composed
 * refs to mock hosts, so the logic is verified here and the effect
 * wiring is verified through the null path).
 */
export function checkDisabledRenderContract(
  node: Pick<HTMLElement, "getAttribute" | "tagName"> | null,
): { message: string; data: Record<string, unknown> } | null {
  if (node == null) {
    return {
      message:
        "disabled render component did not forward its ref — the cooperative render contract requires spreading received props AND ref onto the underlying element",
      data: {},
    };
  }
  if (
    node.getAttribute("aria-disabled") !== "true" ||
    node.getAttribute("tabindex") !== "-1"
  ) {
    return {
      message:
        "disabled render component dropped required props — its underlying element lacks aria-disabled/tabindex; forward received props to the DOM element",
      data: { element: node.tagName },
    };
  }
  return null;
}
