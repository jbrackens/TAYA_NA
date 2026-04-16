"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  maxWidth?: number;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 500,
}: ModalProps) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onCloseRef.current();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open) return null;

  const backdropStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  };

  const contentStyle: React.CSSProperties = {
    position: "relative",
    backgroundColor: "#0f1225",
    border: "1px solid #1a1f3a",
    borderRadius: "8px",
    maxWidth: `${maxWidth}px`,
    width: "90%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
  };

  const headerStyle: React.CSSProperties = {
    padding: "20px",
    borderBottom: "1px solid #1a1f3a",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "18px",
    fontWeight: "700",
    color: "#e2e8f0",
    margin: 0,
  };

  const closeButtonStyle: React.CSSProperties = {
    width: "32px",
    height: "32px",
    padding: 0,
    backgroundColor: "transparent",
    border: "none",
    color: "#64748b",
    fontSize: "20px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  };

  const bodyStyle: React.CSSProperties = {
    padding: "20px",
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          {title && <h2 style={titleStyle}>{title}</h2>}
          <button
            onClick={onClose}
            style={closeButtonStyle}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = "#39ff14";
              el.style.backgroundColor = "rgba(57, 255, 20, 0.1)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = "#64748b";
              el.style.backgroundColor = "transparent";
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        {children && <div style={bodyStyle}>{children}</div>}
      </div>
    </div>
  );
}
