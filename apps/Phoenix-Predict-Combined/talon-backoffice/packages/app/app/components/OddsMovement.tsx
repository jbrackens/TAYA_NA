"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface OddsMovementProps {
  currentOdds: number;
  previousOdds?: number;
  showPercentage?: boolean;
}

export const OddsMovement: React.FC<OddsMovementProps> = ({
  currentOdds,
  previousOdds,
  showPercentage = true,
}) => {
  const [isFlashing, setIsFlashing] = useState(false);
  const [movement, setMovement] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (!previousOdds) return;

    if (currentOdds > previousOdds) {
      setMovement("up");
      setIsFlashing(true);
    } else if (currentOdds < previousOdds) {
      setMovement("down");
      setIsFlashing(true);
    }

    const timer = setTimeout(() => setIsFlashing(false), 600);
    return () => clearTimeout(timer);
  }, [currentOdds, previousOdds]);

  if (!movement || !previousOdds) {
    return (
      <span
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#e2e8f0",
        }}
      >
        {currentOdds.toFixed(2)}
      </span>
    );
  }

  const percentageChange = ((currentOdds - previousOdds) / previousOdds) * 100;
  const arrow =
    movement === "up" ? (
      <TrendingUp size={12} strokeWidth={2} />
    ) : (
      <TrendingDown size={12} strokeWidth={2} />
    );
  const arrowColor = movement === "up" ? "#22c55e" : "#f87171";
  const percentageColor = movement === "up" ? "#22c55e" : "#f87171";

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes flashAnimation {
            0% {
              opacity: 1;
              background-color: rgba(74, 126, 255, 0.25);
            }
            100% {
              opacity: 1;
              background-color: transparent;
            }
          }
        `,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 8px",
          borderRadius: "4px",
          animation: isFlashing ? "flashAnimation 0.6s ease-out" : "none",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "20px",
            fontSize: "14px",
            fontWeight: 700,
            color: arrowColor,
          }}
        >
          {arrow}
        </span>
        <span
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#e2e8f0",
          }}
        >
          {currentOdds.toFixed(2)}
        </span>
        {showPercentage && (
          <span
            style={{
              fontSize: "11px",
              color: percentageColor,
              fontWeight: 600,
            }}
          >
            {percentageChange > 0 ? "+" : ""}
            {percentageChange.toFixed(1)}%
          </span>
        )}
      </div>
    </>
  );
};

export default OddsMovement;
