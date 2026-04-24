"use client";

import React from "react";

interface TabsProps {
  tabs: { label: string; key: string }[];
  activeKey: string;
  onChange: (key: string) => void;
}

export default function Tabs({ tabs, activeKey, onChange }: TabsProps) {
  const containerStyle: React.CSSProperties = {
    display: "flex",
    borderBottom: "1px solid #1a1f3a",
    gap: "0",
  };

  const getTabStyle = (key: string): React.CSSProperties => {
    const isActive = key === activeKey;
    return {
      padding: "12px 20px",
      fontSize: "14px",
      fontWeight: "600",
      color: isActive ? "var(--accent)" : "#64748b",
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
      borderBottom: isActive ? "2px solid var(--accent)" : "none",
      marginBottom: isActive ? "-1px" : "0",
      transition: "all 0.2s",
      whiteSpace: "nowrap",
      position: "relative",
    };
  };

  return (
    <div style={containerStyle}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={getTabStyle(tab.key)}
          onMouseEnter={(e) => {
            if (tab.key !== activeKey) {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = "#cbd5e1";
            }
          }}
          onMouseLeave={(e) => {
            if (tab.key !== activeKey) {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = "#64748b";
            }
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
