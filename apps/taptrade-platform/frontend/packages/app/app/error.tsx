"use client";

import { useEffect } from "react";
import { logger } from "./lib/logger";

// Named AppError, not Error: shadowing the global Error inside a
// component whose props reference the real Error type is asking for the
// annotation to silently resolve to the component (Next only cares that
// the default export is a component, not its name).
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("App", "Unhandled app error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 py-10 text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--reward)_45%,var(--border-1))] bg-[var(--reward-soft)] text-[28px]">
        ⚠️
      </div>
      <h2 className="mb-2 text-xl font-bold text-[var(--t1)]">
        Something went wrong
      </h2>
      <p className="mb-6 max-w-[400px] text-sm leading-relaxed text-[var(--t2)]">
        Something went wrong. Please try again or contact support.
        {process.env.NODE_ENV === "development" && error.message && (
          <span className="mt-2 block font-mono text-xs text-[var(--t3)]">
            {error.message}
          </span>
        )}
      </p>
      <button
        type="button"
        onClick={reset}
        className="cursor-pointer rounded-lg border-0 bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--ticket-cta-text)] shadow-[var(--shadow-card)]"
      >
        Try Again
      </button>
    </div>
  );
}
