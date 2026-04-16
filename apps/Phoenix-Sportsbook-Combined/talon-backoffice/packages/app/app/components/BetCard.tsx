"use client";

import React, { useState } from "react";

const Badge: React.FC<{
  variant?: "live" | "finished" | "upcoming" | "cancelled";
  children: React.ReactNode;
}> = ({ variant = "upcoming", children }) => {
  const colors: Record<string, { bg: string; color: string }> = {
    live: { bg: "rgba(34,197,94,0.15)", color: "#22c55e" },
    finished: { bg: "rgba(100,116,139,0.15)", color: "#D3D3D3" },
    upcoming: { bg: "rgba(57,255,20,0.15)", color: "#39ff14" },
    cancelled: { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  };
  const c = colors[variant] || colors.upcoming;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        background: c.bg,
        color: c.color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
};

interface Bet {
  betId: string;
  createdAt: string;
  status: string;
  stakeCents: number;
  odds: number;
  marketId: string;
  selectionId: string;
  settledAt?: string;
  freebetId?: string;
  bonusFundedCents?: number;
}

interface BetCardProps {
  bet: Bet;
}

export const BetCard: React.FC<BetCardProps> = ({ bet }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "won":
      case "lost":
        return "finished" as const;
      case "open":
      case "pending":
      case "accepted":
        return "upcoming" as const;
      case "cancelled":
      case "refunded":
        return "cancelled" as const;
      default:
        return "upcoming" as const;
    }
  };

  const formatCurrency = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const stake = formatCurrency(bet.stakeCents);
  const potentialReturn = formatCurrency(Math.round(bet.stakeCents * bet.odds));

  const borderTopColor = "#4a7eff20";
  const summaryRowStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    padding: "12px 0",
  };

  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: "#16213e",
        border: "1px solid #0f3460",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={(e) => {
        const element = e.currentTarget as HTMLElement;
        element.style.borderColor = "#4a7eff";
        element.style.boxShadow = "0 4px 12px #4a7eff20";
      }}
      onMouseLeave={(e) => {
        const element = e.currentTarget as HTMLElement;
        element.style.borderColor = "#0f3460";
        element.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ fontSize: "12px", color: "#a0a0a0" }}>
            Bet #{bet.betId.slice(0, 8)}
          </div>
          <div style={{ fontSize: "13px", color: "#a0a0a0" }}>
            {new Date(bet.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Badge variant={getStatusVariant(bet.status)}>
            {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
          </Badge>
          {bet.freebetId && (
            <span
              style={{
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: 600,
                textTransform: "uppercase",
                backgroundColor: "rgba(59,130,246,0.15)",
                color: "#60a5fa",
              }}
            >
              Free Bet
            </span>
          )}
          {(bet.bonusFundedCents ?? 0) > 0 && (
            <span
              style={{
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: 600,
                textTransform: "uppercase",
                backgroundColor: "rgba(234,179,8,0.15)",
                color: "#facc15",
              }}
            >
              Bonus
            </span>
          )}
        </div>
      </div>

      <div
        style={{ ...summaryRowStyle, borderTop: `1px solid ${borderTopColor}` }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "12px",
              color: "#a0a0a0",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Stake
          </span>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>
            {stake}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "12px",
              color: "#a0a0a0",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Odds
          </span>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>
            {bet.odds.toFixed(2)}
          </span>
        </div>
      </div>

      <div
        style={{ ...summaryRowStyle, borderTop: `1px solid ${borderTopColor}` }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "12px",
              color: "#a0a0a0",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Potential Return
          </span>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>
            {potentialReturn}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "12px",
              color: "#a0a0a0",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Profit/Loss
          </span>
          {bet.status === "won" ? (
            <span
              style={{ fontSize: "16px", fontWeight: 700, color: "#22c55e" }}
            >
              +{formatCurrency(Math.round(bet.stakeCents * (bet.odds - 1)))}
            </span>
          ) : bet.status === "lost" ? (
            <span
              style={{ fontSize: "16px", fontWeight: 700, color: "#f87171" }}
            >
              -{stake}
            </span>
          ) : (
            <span
              style={{ fontSize: "16px", fontWeight: 700, color: "#ffffff" }}
            >
              Pending
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: expanded ? "block" : "none",
          marginTop: "12px",
          paddingTop: "12px",
          borderTop: `1px solid ${borderTopColor}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              padding: "8px",
              backgroundColor: "#4a7eff08",
              borderRadius: "4px",
              fontSize: "12px",
              color: "#a0a0a0",
            }}
          >
            Market: {bet.marketId}
          </div>
          <div
            style={{
              padding: "8px",
              backgroundColor: "#4a7eff08",
              borderRadius: "4px",
              fontSize: "12px",
              color: "#a0a0a0",
            }}
          >
            Selection: {bet.selectionId}
          </div>
          {bet.settledAt && (
            <div
              style={{
                padding: "8px",
                backgroundColor: "#4a7eff08",
                borderRadius: "4px",
                fontSize: "12px",
                color: "#a0a0a0",
              }}
            >
              Settled: {new Date(bet.settledAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BetCard;
