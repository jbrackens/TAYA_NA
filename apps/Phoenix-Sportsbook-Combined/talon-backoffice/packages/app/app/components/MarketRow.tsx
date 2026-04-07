"use client";

import React from "react";
import OddsButton from "./OddsButton";

interface Selection {
  id: string;
  name: string;
  price: number;
  base?: number | string | null;
}

interface Market {
  id: string;
  name: string;
  status?: string;
  selections?: any[];
  type?: string;
  displayKey?: string;
}

interface MarketRowProps {
  market: Market;
  fixtureId: string;
  fixtureName: string;
  onSelectMarket?: (
    marketId: string,
    selectionId: string,
    odds: number,
  ) => void;
}

const MarketRowComponent: React.FC<MarketRowProps> = ({
  market,
  fixtureId,
  fixtureName,
}) => {
  if (!market.selections || market.selections.length === 0) {
    return null;
  }

  const normalizedStatus = (market.status || "open").toLowerCase();
  const isSuspended = ["suspended", "closed", "inactive", "blocked"].includes(
    normalizedStatus,
  );
  const showLineLabel = (market.type || market.displayKey || market.name || "")
    .toLowerCase()
    .match(/total|handicap|spread|line|over\/under|run line|puck line/);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "14px",
        borderRadius: "12px",
        background:
          "linear-gradient(180deg, rgba(19,25,40,0.9) 0%, rgba(14,19,31,0.94) 100%)",
        border: "1px solid #202a3e",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc" }}>
            {market.name}
          </div>
          <div
            style={{
              marginTop: "3px",
              fontSize: "11px",
              color: "#D3D3D3",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {market.displayKey || market.type || "Market"}
          </div>
        </div>
        <span
          style={{
            padding: "4px 8px",
            borderRadius: "999px",
            background: isSuspended
              ? "rgba(239,68,68,0.12)"
              : "rgba(57,255,20,0.08)",
            border: `1px solid ${isSuspended ? "rgba(239,68,68,0.22)" : "rgba(57,255,20,0.14)"}`,
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: isSuspended ? "#fca5a5" : "#D3D3D3",
            whiteSpace: "nowrap",
          }}
        >
          {isSuspended ? "Suspended" : `${market.selections.length} outcomes`}
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "8px",
        }}
      >
        {market.selections.map((selection: any) => (
          <OddsButton
            key={selection.id}
            fixtureId={fixtureId}
            marketId={market.id}
            selectionId={selection.id}
            odds={selection.price || selection.odds}
            matchName={fixtureName}
            marketName={market.name}
            selectionName={selection.name}
            suspended={isSuspended}
            label={showLineLabel ? selection.base : undefined}
            subtitle={showLineLabel ? selection.name : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export const MarketRow = React.memo(MarketRowComponent);

export default MarketRow;
