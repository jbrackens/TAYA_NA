"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  maxWidth?: number;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 500,
}: ModalProps) {
  const { t } = useTranslation("common");
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // A11y (2026-07-12): move focus into the dialog on open, restore to the
  // opener on close, and trap Tab inside while open (WCAG 2.4.3 / 2.1.2).
  useEffect(() => {
    if (!open) return;
    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialogRef.current?.focus();
    return () => {
      openerRef.current?.focus();
      openerRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusables = Array.from(
          dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        if (focusables.length === 0) {
          e.preventDefault();
          dialog.focus();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey) {
          if (active === first || active === dialog) {
            e.preventDefault();
            last.focus();
          }
        } else if (active === last || active === dialog) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className="relative max-h-[90vh] w-[90%] overflow-y-auto rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] shadow-[var(--shadow-pop)] outline-none"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-1)] p-5">
          {title && (
            <h2 id={titleId} className="m-0 text-lg font-bold text-[var(--t1)]">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("CLOSE", "Close")}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--r-rh-sm)] border-0 bg-transparent p-0 text-xl text-[var(--t3)] transition-all duration-200 hover:bg-[var(--surface-2)] hover:text-[var(--t1)]"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        {children && <div className="p-5 text-[var(--t2)]">{children}</div>}
      </div>
    </div>
  );
}
