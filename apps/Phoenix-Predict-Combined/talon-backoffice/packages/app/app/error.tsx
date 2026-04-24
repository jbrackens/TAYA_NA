"use client";

import React, { useEffect } from "react";
import { logger } from "./lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("App", "Phoenix app error", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "40px 20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          fontSize: 28,
        }}
      >
        ⚠️
      </div>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#f8fafc",
          marginBottom: 8,
        }}
      >
        Something went wrong
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "#64748b",
          marginBottom: 24,
          maxWidth: 400,
          lineHeight: 1.6,
        }}
      >
        Something went wrong. Please try again or contact support.
        {process.env.NODE_ENV === "development" && error.message && (
          <span
            style={{
              display: "block",
              marginTop: 8,
              fontSize: 12,
              color: "#94a3b8",
              fontFamily: "monospace",
            }}
          >
            {error.message}
          </span>
        )}
      </p>
      <button
        onClick={reset}
        style={{
          padding: "10px 24px",
          borderRadius: 8,
          border: "none",
          background:
            "linear-gradient(135deg, var(--accent), var(--accent-lo))",
          color: "#101114",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(43, 228, 128,0.25)",
        }}
      >
        Try Again
      </button>
    </div>
  );
}
