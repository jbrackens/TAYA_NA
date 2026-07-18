"use client";

/**
 * Dialog — modal primitive on @base-ui-components/react (P1).
 *
 * Layering: OVERLAY_Z (backdrop 200 / popup 240) — between the sticky
 * TopBar (z-[100]) and toasts (z-[9999]). Theme: the popup portals into
 * document.body, OUTSIDE the .predict-terminal wrapper; it resolves the
 * route's tokens through the html[data-theme="terminal"] mirror that
 * AppShell maintains (globals.css pairs the selectors) — do not add
 * per-dialog container plumbing.
 */

import { Dialog as BaseDialog } from "@base-ui-components/react/dialog";
import type { ComponentProps, ReactNode } from "react";
import { OVERLAY_Z, cx } from "./variants";

const BACKDROP_CLASS = cx(
  "fixed inset-0 bg-black/55 backdrop-blur-[2px]",
  "transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
  OVERLAY_Z.backdrop,
);

const POPUP_CLASS = cx(
  "fixed left-1/2 top-1/2 w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2",
  "rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-6 text-[var(--t1)] shadow-[var(--shadow-pop)]",
  "transition-[opacity,transform] duration-150 data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0",
  OVERLAY_Z.dialog,
);

export const Dialog = BaseDialog.Root;
export const DialogTrigger = BaseDialog.Trigger;
export const DialogClose = BaseDialog.Close;

// Our API accepts plain string classNames only (Base UI also allows a
// state-function form; the primitives layer keeps call sites simple).
type StringClass<T> = Omit<T, "className"> & { className?: string };

export function DialogContent({
  className,
  children,
  ...rest
}: StringClass<ComponentProps<typeof BaseDialog.Popup>> & {
  children: ReactNode;
}) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className={BACKDROP_CLASS} />
      <BaseDialog.Popup className={cx(POPUP_CLASS, className)} {...rest}>
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

export function DialogTitle({
  className,
  ...rest
}: StringClass<ComponentProps<typeof BaseDialog.Title>>) {
  return (
    <BaseDialog.Title
      className={cx(
        "type-display m-0 mb-2 text-lg font-semibold text-[var(--t1)]",
        className,
      )}
      {...rest}
    />
  );
}

export function DialogDescription({
  className,
  ...rest
}: StringClass<ComponentProps<typeof BaseDialog.Description>>) {
  return (
    <BaseDialog.Description
      className={cx("m-0 mb-4 text-sm text-[var(--t2)]", className)}
      {...rest}
    />
  );
}
