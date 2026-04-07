"use client";

import React, { useEffect, useState, useRef } from "react";
import { Lock } from "lucide-react";
import { useBetslip } from "../hooks/useBetslip";
import { BetSelection } from "./BetslipProvider";
import { useAppSelector } from "../lib/store/hooks";
import { selectOddsFormat } from "../lib/store/settingsSlice";
import { selectMovement } from "../lib/store/marketSlice";
import { formatOdds } from "../lib/utils/odds";

interface OddsButtonProps {
  fixtureId: string;
  marketId: string;
  selectionId: string;
  odds: number;
  matchName: string;
  marketName: string;
  selectionName: string;
  suspended?: boolean;
  /** Label for the button, defaults to selectionName if not provided */
  label?: string;
  subtitle?: string;
  compact?: boolean;
}

export const OddsButton: React.FC<OddsButtonProps> = ({
  fixtureId,
  marketId,
  selectionId,
  odds,
  matchName,
  marketName,
  selectionName,
  suspended,
  label,
  subtitle,
  compact,
}) => {
  const betslip = useBetslip();
  const oddsFormat = useAppSelector(selectOddsFormat);
  const movement = useAppSelector(selectMovement(`${marketId}:${selectionId}`));
  const [isFlashing, setIsFlashing] = useState<"up" | "down" | null>(null);
  const prevOddsRef = useRef(odds);

  const isSelected = betslip.selections.some(
    (s) => s.selectionId === selectionId && s.marketId === marketId,
  );

  useEffect(() => {
    if (odds > prevOddsRef.current) {
      setIsFlashing("up");
      const timer = setTimeout(() => setIsFlashing(null), 600);
      prevOddsRef.current = odds;
      return () => clearTimeout(timer);
    } else if (odds < prevOddsRef.current) {
      setIsFlashing("down");
      const timer = setTimeout(() => setIsFlashing(null), 600);
      prevOddsRef.current = odds;
      return () => clearTimeout(timer);
    }
    prevOddsRef.current = odds;
  }, [odds]);

  // Also check Redux movement for WS updates
  useEffect(() => {
    if (movement && Date.now() - movement.timestamp < 2000) {
      setIsFlashing(movement.direction);
      const timer = setTimeout(() => setIsFlashing(null), 600);
      return () => clearTimeout(timer);
    }
  }, [movement]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (suspended) return;

    const existing = betslip.selections.find(
      (s) => s.selectionId === selectionId && s.marketId === marketId,
    );

    if (existing) {
      betslip.removeSelection(existing.id);
    } else {
      const selection: BetSelection = {
        id: `${marketId}-${selectionId}`, // Temporary ID, Provider will overwrite
        fixtureId,
        marketId,
        selectionId,
        matchName,
        marketName,
        selectionName,
        odds,
        initialOdds: odds,
      };
      betslip.addSelection(selection);
    }
  };

  const getBackgroundColor = () => {
    if (suspended) return "#1c2333";
    if (isSelected) return "linear-gradient(135deg, rgba(57,255,20,0.18), rgba(57,255,20,0.08))";
    if (isFlashing === "up") return "rgba(34, 197, 94, 0.2)";
    if (isFlashing === "down") return "rgba(239, 68, 68, 0.2)";
    return "linear-gradient(180deg, #1b2234 0%, #141a2a 100%)";
  };

  return (
    <button
      onClick={handleToggle}
      disabled={suspended}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "space-between",
        width: "100%",
        minHeight: compact ? "52px" : "64px",
        padding: compact ? "8px 10px" : "10px 12px",
        background: getBackgroundColor(),
        border: `1px solid ${
          isSelected
            ? "rgba(57,255,20,0.55)"
            : isFlashing === "up"
              ? "rgba(34, 197, 94, 0.4)"
              : isFlashing === "down"
                ? "rgba(239, 68, 68, 0.4)"
                : "#2a3245"
        }`,
        borderRadius: "10px",
        cursor: suspended ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        color: isSelected ? "#ffffff" : "#e2e8f0",
        position: "relative",
        opacity: suspended ? 0.6 : 1,
        boxShadow: isSelected
          ? "0 8px 20px rgba(57,255,20,0.12)"
          : "inset 0 1px 0 rgba(255,255,255,0.04)",
        textAlign: "left",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!suspended && !isSelected && !isFlashing) {
          e.currentTarget.style.background = "linear-gradient(180deg, #222b40 0%, #182032 100%)";
          e.currentTarget.style.borderColor = "rgba(57,255,20,0.25)";
        }
      }}
      onMouseLeave={(e) => {
        if (!suspended && !isSelected && !isFlashing) {
          e.currentTarget.style.background = "linear-gradient(180deg, #1b2234 0%, #141a2a 100%)";
          e.currentTarget.style.borderColor = "#2a3245";
        }
      }}
    >
      {!suspended && isSelected && (
        <span
          style={{
            position: "absolute",
            inset: "0 auto auto 0",
            width: "100%",
            height: "2px",
            background: "linear-gradient(90deg, #39ff14 0%, rgba(57,255,20,0.15) 100%)",
          }}
        />
      )}
      {suspended ? (
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#D3D3D3",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Suspended
          </span>
          <Lock size={14} color="#D3D3D3" />
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              width: "100%",
              gap: "8px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: label ? "#D3D3D3" : "#f8fafc",
                  opacity: label ? 0.9 : 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                {label || selectionName}
              </span>
              {(subtitle || label) && (
                <span
                  style={{
                    display: "block",
                    marginTop: "2px",
                    fontSize: "11px",
                    color: "#D3D3D3",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                  }}
                >
                  {subtitle || selectionName}
                </span>
              )}
            </div>
            {isFlashing && (
              <span
                style={{
                  flexShrink: 0,
                  fontSize: "10px",
                  fontWeight: 800,
                  color: isFlashing === "up" ? "#4ade80" : "#f87171",
                }}
              >
                {isFlashing === "up" ? "UP" : "DOWN"}
              </span>
            )}
          </div>
          <span
            style={{
              fontSize: compact ? "14px" : "16px",
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
              color: isSelected ? "#f8fafc" : "#39ff14",
              marginTop: "6px",
            }}
          >
            {formatOdds(odds, oddsFormat)}
          </span>
        </>
      )}
    </button>
  );
};

export default OddsButton;
