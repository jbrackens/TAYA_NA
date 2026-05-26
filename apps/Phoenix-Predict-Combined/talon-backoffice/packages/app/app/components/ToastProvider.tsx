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

// Colors target the P8 cream theme (--bg-deep #f8f9fa). The prior values
// were inherited from the dark sportsbook theme and rendered white-on-faint
// on the prediction app's light backdrop — toasts fired but were invisible
// (caught when QA placed a trade and saw no feedback despite the toast
// existing in the DOM). Backgrounds use the existing *-soft tokens; titles
// and messages now sit on AA-contrast text tokens.
const toastClasses: Record<
  ToastType,
  {
    root: string;
    icon: string;
    title: string;
    message: string;
  }
> = {
  success: {
    root: "border-[var(--yes-text)] bg-[var(--yes-soft)]",
    icon: "bg-[var(--yes-soft)] text-[var(--yes-text)]",
    title: "text-[var(--yes-text)]",
    message: "text-[var(--t2)]",
  },
  error: {
    root: "border-[var(--no-text)] bg-[var(--no-soft)]",
    icon: "bg-[var(--no-soft)] text-[var(--no-text)]",
    title: "text-[var(--no-text)]",
    message: "text-[var(--t2)]",
  },
  info: {
    root: "border-[var(--focus-ring)] bg-[var(--accent-soft)]",
    icon: "bg-[var(--accent-soft)] text-[var(--focus-ring)]",
    title: "text-[var(--t1)]",
    message: "text-[var(--t2)]",
  },
  warning: {
    root: "border-[#b45309] bg-[rgba(251,191,36,0.18)]",
    icon: "bg-[rgba(251,191,36,0.22)] text-[#b45309]",
    title: "text-[#b45309]",
    message: "text-[var(--t2)]",
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
      className={`pointer-events-auto flex min-w-[300px] max-w-[400px] items-start gap-3 rounded-[10px] border px-4 py-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 ${exiting ? "translate-x-10 opacity-0" : "translate-x-0 opacity-100"} ${c.root}`}
    >
      {/* Icon */}
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${c.icon}`}>
        {icons[toast.type]}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className={`text-[13px] font-semibold leading-[1.4] ${c.title}`}>
          {toast.title}
        </div>
        {toast.message && (
          <div className={`mt-0.5 text-xs leading-normal ${c.message}`}>
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
