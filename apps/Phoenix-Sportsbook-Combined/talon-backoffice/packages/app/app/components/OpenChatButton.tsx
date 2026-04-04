"use client";

import React, { useState, useEffect } from "react";

export default function OpenChatButton() {
  const [isVisible, setIsVisible] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Always visible after mount (SSR guard)
    setIsVisible(true);
  }, []);

  const handleClick = () => {
    // Open external support chat
    const chatUrl =
      process.env.NEXT_PUBLIC_SUPPORT_CHAT_URL ||
      "https://support.phoenix-sportsbook.com/chat";
    window.open(chatUrl, "supportChat", "width=800,height=600");
  };

  const buttonStyle: React.CSSProperties = {
    position: "fixed",
    bottom: "90px",
    right: "24px",
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "#f97316",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(249, 115, 22, 0.3)",
    transition: "all 0.3s",
    opacity: isVisible ? 1 : 0,
    pointerEvents: isVisible ? "auto" : "none",
    zIndex: 999,
  };

  const iconStyle: React.CSSProperties = {
    width: "24px",
    height: "24px",
    color: "#0f1225",
    fontWeight: "bold",
    fontSize: "20px",
  };

  const tooltipStyle: React.CSSProperties = {
    position: "absolute",
    right: "64px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "#1a1f3a",
    color: "#e2e8f0",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    whiteSpace: "nowrap",
    pointerEvents: "none",
    opacity: showTooltip ? 1 : 0,
    transition: "opacity 0.2s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  };

  return (
    <div
      style={{ position: "fixed", bottom: "90px", right: "24px", zIndex: 999 }}
    >
      <div style={tooltipStyle}>Need Help?</div>
      <button
        onClick={handleClick}
        style={{
          ...buttonStyle,
          position: "relative",
          bottom: "auto",
          right: "auto",
        }}
        title="Need Help?"
        onMouseEnter={(e) => {
          setShowTooltip(true);
          e.currentTarget.style.backgroundColor = "#ea580c";
          e.currentTarget.style.boxShadow =
            "0 6px 16px rgba(249, 115, 22, 0.4)";
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          setShowTooltip(false);
          e.currentTarget.style.backgroundColor = "#f97316";
          e.currentTarget.style.boxShadow =
            "0 4px 12px rgba(249, 115, 22, 0.3)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <span style={iconStyle}>💬</span>
      </button>
    </div>
  );
}
