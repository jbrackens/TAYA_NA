"use client";

import React, { useState } from "react";
import MarketRow from "./MarketRow";

interface MarketSelection {
  id: string;
  name: string;
  price: number;
  odds?: number;
  base?: string | number | null;
}

interface Market {
  id: string;
  name: string;
  status?: string;
  selections?: MarketSelection[];
  type?: string;
  displayKey?: string;
}

interface MarketGroupProps {
  name: string;
  markets: Market[];
  fixtureId: string;
  fixtureName: string;
  onSelectMarket?: (
    marketId: string,
    selectionId: string,
    odds: number,
  ) => void;
}

const MarketGroupComponent: React.FC<MarketGroupProps> = ({
  name,
  markets,
  fixtureId,
  fixtureName,
  onSelectMarket,
}) => {
  const [expanded, setExpanded] = useState(true);

  if (markets.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, rgba(17,22,38,0.96) 0%, rgba(11,14,28,0.98) 100%)",
        border: "1px solid #1f2940",
        borderRadius: "14px",
        overflow: "hidden",
        marginBottom: "14px",
        boxShadow: "0 16px 32px rgba(0,0,0,0.18)",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "14px 18px",
          background: "none",
          border: "none",
          color: "#e2e8f0",
          cursor: "pointer",
          transition: "all 0.2s",
          borderBottom: expanded ? "1px solid #1f2940" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h3
            style={{
              margin: "0",
              fontSize: "16px",
              fontWeight: "800",
              color: "#f8fafc",
            }}
          >
            {name}
          </h3>
          <span
            style={{
              padding: "3px 8px",
              borderRadius: "999px",
              background: "rgba(43, 228, 128,0.08)",
              border: "1px solid rgba(43, 228, 128,0.14)",
              color: "#D3D3D3",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {markets.length} {markets.length === 1 ? "market" : "markets"}
          </span>
        </div>
        <span
          style={{
            display: "inline-block",
            transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            color: "var(--accent)",
            fontSize: "12px",
          }}
        >
          ▼
        </span>
      </button>

      {expanded && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            padding: "16px",
          }}
        >
          {markets.map((market) => (
            <MarketRow
              key={market.id}
              market={market}
              fixtureId={fixtureId}
              fixtureName={fixtureName}
              onSelectMarket={onSelectMarket}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const MarketGroup = React.memo(MarketGroupComponent);

export default MarketGroup;
