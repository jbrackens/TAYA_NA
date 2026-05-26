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
      <span className="text-sm font-semibold text-[#e2e8f0]">
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
  const movementColor =
    movement === "up" ? "text-[#22c55e]" : "text-[var(--no)]";

  return (
    <div
      className={`flex items-center gap-1.5 rounded px-2 py-1 transition-colors duration-700 ${isFlashing ? "bg-[rgba(74,126,255,0.25)]" : "bg-transparent"}`}
    >
      <span
        className={`inline-flex min-w-5 items-center justify-center text-sm font-bold ${movementColor}`}
      >
        {arrow}
      </span>
      <span className="text-sm font-semibold text-[#e2e8f0]">
        {currentOdds.toFixed(2)}
      </span>
      {showPercentage && (
        <span className={`text-[11px] font-semibold ${movementColor}`}>
          {percentageChange > 0 ? "+" : ""}
          {percentageChange.toFixed(1)}%
        </span>
      )}
    </div>
  );
};

export default OddsMovement;
