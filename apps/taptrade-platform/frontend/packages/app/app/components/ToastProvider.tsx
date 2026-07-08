"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { Check, X, Info, AlertTriangle } from "lucide-react";

// ── Types ──
export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 4000
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
};

// ── Icons ──
const icons: Record<ToastType, React.ReactNode> = {
  success: <Check size={14} strokeWidth={2} />,
  error: <X size={14} strokeWidth={2} />,
  info: <Info size={14} strokeWidth={2} />,
  warning: <AlertTriangle size={14} strokeWidth={2} />,
};

// P9 (2026-07-08): toasts are system cards, not tinted glass. The retired
// treatment (colored border on a translucent *-soft fill + tinted icon
// block) survived from the soft-tint era and read as glassmorphism on the
// white P9 backdrop — login/logout toasts were hard to read. Now: white
// --surface-1 card, hairline --border-1, --shadow-card, INK title, --t2
// message, and status speaks through the dot signature (DESIGN.md "The
// dot") plus a tinted icon glyph — never through the card surface.
const toastClasses: Record<
  ToastType,
  {
    dot: string;
    icon: string;
  }
> = {
  success: {
    dot: "bg-[var(--yes-bar)]",
    icon: "text-[var(--yes-text)]",
  },
  error: {
    dot: "bg-[var(--no-bar)]",
    icon: "text-[var(--no-text)]",
  },
  info: {
    dot: "bg-[var(--brand-period)]",
    icon: "text-[var(--accent-text)]",
  },
  warning: {
    dot: "bg-[#d97706]",
    icon: "text-[#b45309]",
  },
};

// ── Single Toast Component ──
const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({
  toast,
  onRemove,
}) => {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const c = toastClasses[toast.type];
  const toastId = toast.id;
  const toastDuration = toast.duration;

  useEffect(() => {
    const dur = toastDuration ?? 4000;
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toastId), 300);
    }, dur);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toastId, toastDuration, onRemove]);

  const handleClose = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  return (
    <div
      role="status"
      className={`pointer-events-auto flex min-w-[300px] max-w-[400px] items-start gap-3 rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-3.5 shadow-[var(--shadow-card)] transition-all duration-300 motion-reduce:transition-none ${exiting ? "translate-x-10 opacity-0" : "translate-x-0 opacity-100"}`}
    >
      {/* Status: the dot signature + a small tinted glyph on the white card */}
      <div className="flex shrink-0 items-center gap-2 pt-[3px]">
        <span
          className={`h-2.5 w-2.5 rounded-full ${c.dot}`}
          aria-hidden="true"
        />
        <span className={`flex items-center ${c.icon}`}>
          {icons[toast.type]}
        </span>
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold leading-[1.4] text-[var(--t1)]">
          {toast.title}
        </div>
        {toast.message && (
          <div className="mt-0.5 text-xs leading-normal text-[var(--t2)]">
            {toast.message}
          </div>
        )}
      </div>

      {/* Close */}
      <button
        onClick={handleClose}
        className="shrink-0 cursor-pointer border-0 bg-transparent p-0.5 text-base leading-none text-[var(--t3)] transition-colors duration-150 hover:text-[var(--t1)]"
      >
        ×
      </button>
    </div>
  );
};

// ── Provider ──
let toastCounter = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, "id">): string => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const success = useCallback(
    (title: string, message?: string) =>
      addToast({ type: "success", title, message }),
    [addToast],
  );
  const error = useCallback(
    (title: string, message?: string) =>
      addToast({ type: "error", title, message }),
    [addToast],
  );
  const info = useCallback(
    (title: string, message?: string) =>
      addToast({ type: "info", title, message }),
    [addToast],
  );
  const warning = useCallback(
    (title: string, message?: string) =>
      addToast({ type: "warning", title, message }),
    [addToast],
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, info, warning }}
    >
      {children}

      {/* Toast Container — fixed top-right */}
      <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
