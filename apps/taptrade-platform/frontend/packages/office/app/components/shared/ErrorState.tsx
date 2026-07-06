"use client";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetryButton?: boolean;
}

export function ErrorState({
  title = "Failed to load data",
  message = "An error occurred while fetching the data. Please try again.",
  onRetry,
  showRetryButton = true,
}: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-[var(--no,#ff8b6b)] bg-[var(--surface-1,#ffffff)] px-6 py-10 text-center">
      <div className="mb-4 text-5xl">⚠️</div>
      <h3 className="m-0 mb-3 text-lg font-semibold text-[var(--no-text,#a8472d)]">
        {title}
      </h3>
      <p className="m-0 mb-6 text-sm leading-[1.6] text-[var(--t2,#4a4a4a)]">
        {message}
      </p>
      {showRetryButton && onRetry && (
        <button
          className="cursor-pointer rounded-lg border-0 bg-[var(--accent,#2be480)] px-4 py-2 font-semibold text-[#003827] transition-all duration-200 hover:-translate-y-px hover:bg-[var(--accent-lo,#1fa65e)] hover:text-white"
          onClick={onRetry}
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export default ErrorState;
