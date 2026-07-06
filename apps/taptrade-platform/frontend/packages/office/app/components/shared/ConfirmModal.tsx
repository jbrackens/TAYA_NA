"use client";

interface ConfirmModalProps {
  isOpen?: boolean;
  title: string;
  message: string;
  impactSummary?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const baseButtonClass =
  "flex-1 cursor-pointer rounded-lg border-0 px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

export function ConfirmModal({
  isOpen = false,
  title,
  message,
  impactSummary,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const confirmClass =
    variant === "danger"
      ? `${baseButtonClass} bg-[var(--no-text,#a8472d)] text-white hover:enabled:bg-[#8b3a25]`
      : `${baseButtonClass} bg-[var(--accent,#2be480)] text-[#003827] hover:enabled:bg-[var(--accent-lo,#1fa65e)] hover:enabled:text-white`;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(26,26,26,0.45)]"
      onClick={onCancel}
    >
      <div
        className="w-[90%] max-w-[400px] rounded-2xl border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] p-6 shadow-[0_12px_48px_rgba(26,26,26,0.08),0_1px_2px_rgba(26,26,26,0.04)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="m-0 mb-3 text-lg font-bold tracking-[-0.01em] text-[var(--t1,#1a1a1a)]">
          {title}
        </h2>
        <p className="m-0 mb-5 text-sm leading-[1.5] text-[var(--t2,#4a4a4a)]">
          {message}
        </p>

        {impactSummary && (
          <div className="mb-5 rounded-lg border-l-[3px] border-l-[var(--no-text,#a8472d)] bg-[var(--no-soft,rgba(255,139,107,0.16))] p-3">
            <p className="m-0 text-[13px] font-medium text-[var(--no-text,#a8472d)]">
              {impactSummary}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            className={`${baseButtonClass} border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] text-[var(--t1,#1a1a1a)] hover:enabled:border-[var(--focus-ring,#0e7a53)] hover:enabled:bg-[var(--surface-2,#fcfaf5)]`}
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={confirmClass}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
