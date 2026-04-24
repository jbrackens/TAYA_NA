"use client";

import React, { useState } from "react";

interface CollapseProps {
  title: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

export default function Collapse({
  title,
  children,
  defaultOpen = false,
}: CollapseProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const headerStyle: React.CSSProperties = {
    padding: "12px 0",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
    userSelect: "none",
    fontWeight: "600",
    color: "#e2e8f0",
    fontSize: "14px",
    transition: "all 0.2s",
  };

  const chevronStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px",
    color: "var(--accent)",
    fontSize: "12px",
    fontWeight: "bold",
    transition: "transform 0.3s ease",
    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
  };

  const contentWrapperStyle: React.CSSProperties = {
    maxHeight: isOpen ? "1000px" : "0",
    overflow: "hidden",
    transition: "max-height 0.3s ease, opacity 0.3s ease",
    opacity: isOpen ? 1 : 0,
  };

  const contentStyle: React.CSSProperties = {
    padding: isOpen ? "12px 0" : "0",
    fontSize: "14px",
    color: "#cbd5e1",
    lineHeight: "1.6",
  };

  const panelId = `collapse-panel-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        style={{
          ...headerStyle,
          background: "none",
          border: "none",
          width: "100%",
          textAlign: "left",
          fontFamily: "inherit",
        }}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#e2e8f0";
        }}
      >
        <span style={chevronStyle} aria-hidden="true">
          <svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
        {title}
      </button>
      <div
        id={panelId}
        role="region"
        aria-label={title}
        style={contentWrapperStyle}
      >
        <div style={contentStyle}>{children}</div>
      </div>
    </div>
  );
}
