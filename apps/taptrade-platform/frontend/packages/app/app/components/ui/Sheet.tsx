"use client";

/**
 * Sheet — the app's bottom-sheet primitive on vaul (P3). Replaces the
 * hand-rolled fixed panels: vaul owns the drag handle, swipe-dismiss,
 * backdrop, Escape, focus trap, and body scroll-lock. Layering comes
 * from OVERLAY_Z (backdrop 200 / sheet 220 — the old panels used ad hoc
 * z-115/130 below the P1 contract). Content inherits route-native
 * tokens through the html[data-theme] mirror (portalled, like Dialog).
 */

import { Drawer } from "vaul";
import type React from "react";
import { OVERLAY_Z, cx } from "./variants";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible dialog name (rendered visually hidden). */
  title: string;
  className?: string;
  children: React.ReactNode;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  className,
  children,
}: SheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay
          className={cx(
            "fixed inset-0 bg-black/70 backdrop-blur-[2px]",
            OVERLAY_Z.backdrop,
          )}
        />
        <Drawer.Content
          className={cx(
            "fixed inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-2xl border border-b-0 border-[var(--border-1)] bg-[var(--surface-1)] outline-none",
            OVERLAY_Z.sheet,
            className,
          )}
        >
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          <div
            aria-hidden="true"
            className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-[var(--border-2)]"
          />
          <div className="terminal-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pb-[calc(20px+env(safe-area-inset-bottom))] max-[760px]:p-4 max-[760px]:pb-[calc(16px+env(safe-area-inset-bottom))]">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
