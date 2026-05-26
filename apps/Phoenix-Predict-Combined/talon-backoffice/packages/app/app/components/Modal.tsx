"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  maxWidth?: number;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 500,
}: ModalProps) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onCloseRef.current();
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
        className="relative max-h-[90vh] w-[90%] overflow-y-auto rounded-lg border border-[#1a1f3a] bg-[#0f1225] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.5)]"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#1a1f3a] p-5">
          {title && (
            <h2 className="m-0 text-lg font-bold text-slate-200">{title}</h2>
          )}
          <button
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-xl text-slate-500 transition-all duration-200 hover:bg-[rgba(43,228,128,0.1)] hover:text-[var(--accent)]"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        {children && <div className="p-5">{children}</div>}
      </div>
    </div>
  );
}
