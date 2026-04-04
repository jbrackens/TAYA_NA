'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

// ── Types ──
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 4000
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

// ── Icons ──
const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

const colors: Record<ToastType, { bg: string; border: string; icon: string; iconBg: string }> = {
  success: { bg: '#0f2318', border: '#22c55e30', icon: '#22c55e', iconBg: 'rgba(34,197,94,0.15)' },
  error:   { bg: '#231313', border: '#ef444430', icon: '#ef4444', iconBg: 'rgba(239,68,68,0.15)' },
  info:    { bg: '#0f1525', border: '#3b82f630', icon: '#3b82f6', iconBg: 'rgba(59,130,246,0.15)' },
  warning: { bg: '#231f0f', border: '#f59e0b30', icon: '#f59e0b', iconBg: 'rgba(245,158,11,0.15)' },
};

// ── Single Toast Component ──
const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const c = colors[toast.type];
  const toastId = toast.id;
  const toastDuration = toast.duration;

  useEffect(() => {
    const dur = toastDuration ?? 4000;
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toastId), 300);
    }, dur);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toastId, toastDuration, onRemove]);

  const handleClose = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 16px', borderRadius: 10,
        background: c.bg, border: `1px solid ${c.border}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        minWidth: 300, maxWidth: 400,
        animation: exiting ? 'ps-toast-out 0.3s ease forwards' : 'ps-toast-in 0.3s ease forwards',
        pointerEvents: 'auto',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: c.iconBg, color: c.icon,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700,
      }}>
        {icons[toast.type]}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', lineHeight: 1.4 }}>
          {toast.title}
        </div>
        {toast.message && (
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, lineHeight: 1.5 }}>
            {toast.message}
          </div>
        )}
      </div>

      {/* Close */}
      <button
        onClick={handleClose}
        style={{
          background: 'none', border: 'none', color: '#4a5580',
          cursor: 'pointer', fontSize: 16, padding: 2, lineHeight: 1,
          flexShrink: 0, transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#94a3b8'; }}
        onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#4a5580'; }}
      >
        ×
      </button>
    </div>
  );
};

// ── Provider ──
let toastCounter = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const success = useCallback((title: string, message?: string) =>
    addToast({ type: 'success', title, message }), [addToast]);
  const error = useCallback((title: string, message?: string) =>
    addToast({ type: 'error', title, message }), [addToast]);
  const info = useCallback((title: string, message?: string) =>
    addToast({ type: 'info', title, message }), [addToast]);
  const warning = useCallback((title: string, message?: string) =>
    addToast({ type: 'warning', title, message }), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}

      {/* Toast Container — fixed top-right */}
      <div
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>

      {/* Keyframe animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ps-toast-in {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes ps-toast-out {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(40px); }
        }
      `}} />
    </ToastContext.Provider>
  );
};

export default ToastProvider;
