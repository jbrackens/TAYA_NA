"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../lib/store/hooks";
import { toggleBetElement, selectBets } from "../lib/store/betSlice";

const OddsButton: React.FC<{
  odds: number;
  selected?: boolean;
  suspended?: boolean;
  movement?: "up" | "down" | null;
  onClick?: () => void;
}> = ({ odds, selected, suspended, movement, onClick }) => (
  <button
    onClick={onClick}
    disabled={suspended}
    style={{
      padding: "8px 12px",
      borderRadius: 8,
      minWidth: 70,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 2,
      border: `2px solid ${selected ? "#4f46e5" : "#1e2243"}`,
      background: selected ? "#4f46e5" : "#161a35",
      color: selected ? "#fff" : "#e2e8f0",
      fontWeight: 600,
      fontSize: 14,
      cursor: suspended ? "not-allowed" : "pointer",
      opacity: suspended ? 0.5 : 1,
      transition: "all 0.15s",
    }}
  >
    <span style={{ fontWeight: 700 }}>{odds.toFixed(2)}</span>
    {movement && (
      <span
        style={{
          fontSize: 10,
          color: movement === "up" ? "#22c55e" : "#ef4444",
        }}
      >
        {movement === "up" ? (
          <TrendingUp size={10} strokeWidth={2} />
        ) : (
          <TrendingDown size={10} strokeWidth={2} />
        )}
      </span>
    )}
  </button>
);

interface Selection {
  id: string;
  name: string;
  odds: number;
}

interface Market {
  id: string;
  name: string;
  status: string;
  selections?: Selection[];
}

interface MarketRowProps {
  market: Market;
  fixtureId?: string;
  fixtureName?: string;
  onSelectMarket?: (
    marketId: string,
    selectionId: string,
    odds: number,
  ) => void;
}

export const MarketRow: React.FC<MarketRowProps> = ({
  market,
  fixtureId,
  fixtureName,
  onSelectMarket,
}) => {
  const dispatch = useAppDispatch();
  const betslipSelections = useAppSelector(selectBets);

  if (!market.selections || market.selections.length === 0) {
    return null;
  }

  const isOpen = market.status === "open";

  const handleSelect = (selection: Selection) => {
    if (!isOpen) return;

    // Dispatch to betslip store
    dispatch(
      toggleBetElement({
        selectionId: selection.id,
        brandMarketId: market.id,
        selectionName: selection.name,
        marketName: market.name,
        fixtureName: fixtureName || "",
        fixtureId: fixtureId || "",
        odds: {
          decimal: selection.odds,
          american:
            selection.odds >= 2
              ? `+${Math.round((selection.odds - 1) * 100)}`
              : `-${Math.round(100 / (selection.odds - 1))}`,
          fractional: "0/0",
        },
      }),
    );

    // Also call the external handler if provided
    onSelectMarket?.(market.id, selection.id, selection.odds);
  };

  const isSelected = (selectionId: string) =>
    betslipSelections.some(
      (b) => b.selectionId === selectionId && b.brandMarketId === market.id,
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ fontSize: "13px", fontWeight: 500, color: "#a0a0a0" }}>
        {market.name}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
          gap: "8px",
        }}
      >
        {market.selections.map((selection) => (
          <OddsButton
            key={selection.id}
            odds={selection.odds}
            selected={isSelected(selection.id)}
            suspended={!isOpen}
            onClick={() => handleSelect(selection)}
          />
        ))}
      </div>
    </div>
  );
};

export default MarketRow;
