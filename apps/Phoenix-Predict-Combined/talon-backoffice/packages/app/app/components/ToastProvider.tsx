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
const colors: Record<
  ToastType,
  {
    bg: string;
    border: string;
    icon: string;
    iconBg: string;
    titleColor: string;
    messageColor: string;
  }
> = {
  success: {
    bg: "var(--yes-soft)",
    border: "var(--yes-text)",
    icon: "var(--yes-text)",
    iconBg: "var(--yes-soft)",
    titleColor: "var(--yes-text)",
    messageColor: "var(--t2)",
  },
  error: {
    bg: "var(--no-soft)",
    border: "var(--no-text)",
    icon: "var(--no-text)",
    iconBg: "var(--no-soft)",
    titleColor: "var(--no-text)",
    messageColor: "var(--t2)",
  },
  info: {
    bg: "var(--accent-soft)",
    border: "var(--focus-ring)",
    icon: "var(--focus-ring)",
    iconBg: "var(--accent-soft)",
    titleColor: "var(--t1)",
    messageColor: "var(--t2)",
  },
  warning: {
    bg: "rgba(251, 191, 36, 0.18)",
    border: "#b45309",
    icon: "#b45309",
    iconBg: "rgba(251, 191, 36, 0.22)",
    titleColor: "#b45309",
    messageColor: "var(--t2)",
  },
};

// ── Single Toast Component ──
const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({
  toast,
  onRemove,
}) => {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const c = colors[toast.type];
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
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 10,
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        minWidth: 300,
        maxWidth: 400,
        animation: exiting
          ? "ps-toast-out 0.3s ease forwards"
          : "ps-toast-in 0.3s ease forwards",
        pointerEvents: "auto",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          flexShrink: 0,
          background: c.iconBg,
          color: c.icon,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {icons[toast.type]}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: c.titleColor,
            lineHeight: 1.4,
          }}
        >
          {toast.title}
        </div>
        {toast.message && (
          <div
            style={{
              fontSize: 12,
              color: c.messageColor,
              marginTop: 2,
              lineHeight: 1.5,
            }}
          >
            {toast.message}
          </div>
        )}
      </div>

      {/* Close */}
      <button
        onClick={handleClose}
        style={{
          background: "none",
          border: "none",
          color: "var(--t3)",
          cursor: "pointer",
          fontSize: 16,
          padding: 2,
          lineHeight: 1,
          flexShrink: 0,
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.color = "var(--t1)";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.color = "var(--t3)";
        }}
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
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>

      {/* Keyframe animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes ps-toast-in {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes ps-toast-out {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(40px); }
        }
      `,
        }}
      />
    </ToastContext.Provider>
  );
};

export default ToastProvider;
