"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Trophy, Clipboard, Download } from "lucide-react";
import { copyBetCardToClipboard, downloadBetCard } from "./ShareableBetCard";
import { useToast } from "./ToastProvider";
import { logger } from "../lib/logger";

interface ShareWinButtonProps {
  selectionName: string;
  odds: number;
  stakeCents: number;
  payoutCents: number;
  betId: string;
}

export const ShareWinButton: React.FC<ShareWinButtonProps> = ({
  selectionName,
  odds,
  stakeCents,
  payoutCents,
  betId,
}) => {
  const [open, setOpen] = useState(false);
  const [clipboardSupported, setClipboardSupported] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (typeof ClipboardItem === "undefined") {
      setClipboardSupported(false);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const cardData = { selectionName, odds, stakeCents, payoutCents, betId };

  const handleCopy = useCallback(async () => {
    try {
      const success = await copyBetCardToClipboard(cardData);
      if (success) {
        toast.success("Copied!", "Bet card image copied to clipboard.");
      } else {
        toast.error(
          "Not supported",
          "Your browser does not support clipboard images.",
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("ShareWinButton", "Clipboard copy failed", message);
      toast.error("Copy failed", "Could not copy the bet card image.");
    }
    setOpen(false);
  }, [selectionName, odds, stakeCents, payoutCents, betId, toast]);

  const handleDownload = useCallback(() => {
    downloadBetCard(cardData);
    setOpen(false);
  }, [selectionName, odds, stakeCents, payoutCents, betId]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        style={{
          width: "100%",
          padding: "8px 14px",
          border: "1px solid rgba(43, 228, 128,0.24)",
          background: "rgba(43, 228, 128,0.06)",
          color: "var(--accent)",
          fontSize: "12px",
          fontWeight: 700,
          borderRadius: "0 0 8px 8px",
          marginTop: "-8px",
          cursor: "pointer",
          textAlign: "center",
          transition: "background 0.2s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(43, 228, 128,0.12)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(43, 228, 128,0.06)";
        }}
      >
        Share this win <Trophy size={13} strokeWidth={2.5} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Share options"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            background: "#0f1225",
            border: "1px solid #1a1f3a",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            zIndex: 10,
            overflow: "hidden",
          }}
        >
          {clipboardSupported && (
            <button
              role="menuitem"
              onClick={() => void handleCopy()}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                color: "#D3D3D3",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#161a35";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Clipboard size={13} strokeWidth={2} /> Copy to clipboard
            </button>
          )}
          <button
            role="menuitem"
            onClick={handleDownload}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "transparent",
              border: "none",
              borderTop: clipboardSupported ? "1px solid #1a1f3a" : "none",
              color: "#D3D3D3",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#161a35";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Download size={13} strokeWidth={2} /> Download PNG
          </button>
        </div>
      )}
    </div>
  );
};

export default ShareWinButton;
