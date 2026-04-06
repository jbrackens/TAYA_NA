"use client";

import React, { useEffect } from "react";
import { logger } from "../../lib/logger";

export default function SportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("SportError", "Sport page error", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        padding: "40px 20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 48,
          marginBottom: 16,
          opacity: 0.6,
        }}
      >
        🏟️
      </div>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#f8fafc",
          marginBottom: 8,
        }}
      >
        Sport Not Available
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
        {error.message ||
          "This sport may be temporarily unavailable. Please check back soon or try another sport."}
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={reset}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: "none",
            background: "linear-gradient(135deg, #39ff14, #2ed600)",
            color: "#101114",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
        <a
          href="/"
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: "1px solid #1a1f3a",
            background: "transparent",
            color: "#D3D3D3",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
          }}
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}
