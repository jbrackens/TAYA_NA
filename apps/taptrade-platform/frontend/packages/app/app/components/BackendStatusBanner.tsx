"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { logger } from "../lib/logger";

const CHECK_INTERVAL_MS = 30_000;
const TIMEOUT_MS = 5_000;

/**
 * Thin banner that appears when the Go gateway API is unreachable.
 * Polls /api/v1/status every 30s. Shows nothing when healthy.
 */
export function BackendStatusBanner() {
  const [status, setStatus] = useState<"ok" | "down" | "checking">("checking");
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useTranslation("common");

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const res = await fetch("/api/v1/status/", {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (mounted) {
          setStatus(res.ok ? "ok" : "down");
          if (res.ok) setDismissed(false);
        }
      } catch {
        if (mounted) setStatus("down");
      }
    };

    // Initial check
    check();

    // Periodic check
    timerRef.current = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (status === "down") {
      logger.warn("BackendStatus", "Go gateway unreachable");
    }
  }, [status]);

  if (status !== "down" || dismissed) return null;

  // P11: a one-line wire notice on bone — mono, hairline bottom rule,
  // NO-coral text carrying the warning (with words, not color alone).
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 border-b border-[var(--border-1)] bg-[var(--bg-deep)] px-4 py-1.5 font-mono text-[11px] font-medium text-[var(--no-text)]"
    >
      <span>
        {t("BACKEND_OFFLINE", {
          defaultValue:
            "Backend services are offline — some features may not work. Check that the Go gateway is running on port 18080.",
        })}
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 cursor-pointer border border-[var(--border-2)] bg-transparent px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--t2)] hover:border-[var(--rule-ink)] hover:text-[var(--t1)]"
      >
        {t("DISMISS", { defaultValue: "Dismiss" })}
      </button>
    </div>
  );
}

export default BackendStatusBanner;
