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

  return (
    <div
      role="alert"
      style={{
        background: "linear-gradient(90deg, #92400e 0%, #78350f 100%)",
        color: "#fef3c7",
        padding: "8px 16px",
        fontSize: "13px",
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        borderBottom: "1px solid rgba(251, 191, 36, 0.3)",
      }}
    >
      <span>
        ⚠ {t("BACKEND_OFFLINE", {
          defaultValue:
            "Backend services are offline — some features may not work. Check that the Go gateway is running on port 18080.",
        })}
      </span>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: "none",
          border: "1px solid rgba(251, 191, 36, 0.4)",
          color: "#fef3c7",
          padding: "2px 8px",
          borderRadius: "4px",
          fontSize: "11px",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {t("DISMISS", { defaultValue: "Dismiss" })}
      </button>
    </div>
  );
}

export default BackendStatusBanner;
