"use client";

import React from "react";
import { useBetslip } from "../hooks/useBetslip";

const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
  }
> = ({
  variant = "primary",
  size = "md",
  children,
  style,
  disabled,
  ...rest
}) => {
  const sizes = {
    sm: { padding: "6px 12px", fontSize: 12 },
    md: { padding: "10px 18px", fontSize: 14 },
    lg: { padding: "14px 24px", fontSize: 16 },
  };
  const variants = {
    primary: { background: "#39ff14", color: "#101114", border: "none" },
    secondary: {
      background: "#1a1f3a",
      color: "#e2e8f0",
      border: "1px solid #2a3150",
    },
    ghost: { background: "transparent", color: "#818cf8", border: "none" },
    danger: { background: "#ef4444", color: "#fff", border: "none" },
  };
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        ...sizes[size],
        ...variants[variant],
        borderRadius: 8,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s",
        whiteSpace: "nowrap" as const,
        ...style,
      }}
    >
      {children}
    </button>
  );
};
import BetLeg from "./BetLeg";
import QuickStake from "./QuickStake";

export const Betslip: React.FC = () => {
  const {
    selections,
    stakePerLeg,
    parlayMode,
    totalStake,
    potentialReturn,
    removeSelection,
    clearAll,
    setStakePerLeg,
    setParlayMode,
  } = useBetslip();

  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setStakePerLeg(Math.max(value, 0));
  };

  if (selections.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          padding: "20px",
          backgroundColor: "#0f1225",
          borderRadius: "8px",
          height: "100%",
          overflowY: "auto",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px 0",
            fontSize: "16px",
            fontWeight: "700",
            color: "#e2e8f0",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Betslip
        </h3>
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "#64748b",
            fontSize: "13px",
          }}
        >
          Select matches and markets to add bets to your betslip
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "20px",
        backgroundColor: "#0f1225",
        borderRadius: "8px",
        height: "100%",
        overflowY: "auto",
      }}
    >
      <h3
        style={{
          margin: "0 0 16px 0",
          fontSize: "16px",
          fontWeight: "700",
          color: "#e2e8f0",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Betslip
      </h3>

      {selections.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            border: "1px solid #1a1f3a",
            borderRadius: "4px",
            padding: "4px",
            backgroundColor: "#0f1225",
          }}
        >
          <button
            style={{
              flex: 1,
              padding: "8px 12px",
              backgroundColor: !parlayMode ? "#39ff14" : "transparent",
              color: !parlayMode ? "#000" : "#ffffff",
              border: "none",
              borderRadius: "2px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
            onClick={() => setParlayMode(false)}
            onMouseEnter={(e) => {
              if (!parlayMode) e.currentTarget.style.opacity = "0.8";
            }}
            onMouseLeave={(e) => {
              if (!parlayMode) e.currentTarget.style.opacity = "1";
            }}
          >
            Single Bets
          </button>
          <button
            style={{
              flex: 1,
              padding: "8px 12px",
              backgroundColor: parlayMode ? "#39ff14" : "transparent",
              color: parlayMode ? "#000" : "#ffffff",
              border: "none",
              borderRadius: "2px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
            onClick={() => setParlayMode(true)}
            onMouseEnter={(e) => {
              if (parlayMode) e.currentTarget.style.opacity = "0.8";
            }}
            onMouseLeave={(e) => {
              if (parlayMode) e.currentTarget.style.opacity = "1";
            }}
          >
            Parlay
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          maxHeight: "300px",
          overflowY: "auto",
          paddingRight: "8px",
        }}
      >
        {selections.map((selection) => (
          <BetLeg
            key={selection.id}
            selection={selection}
            onRemove={() => removeSelection(selection.id)}
          />
        ))}
      </div>

      <QuickStake onStakeSelect={setStakePerLeg} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <label
          style={{
            fontSize: "12px",
            fontWeight: "600",
            color: "#64748b",
            textTransform: "uppercase",
          }}
        >
          Stake {parlayMode ? "(Total)" : "(Per Bet)"}
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={stakePerLeg}
          onChange={handleStakeChange}
          placeholder="Enter stake"
          style={{
            padding: "10px",
            backgroundColor: "#0f1225",
            border: "1px solid #1a1f3a",
            borderRadius: "4px",
            color: "#e2e8f0",
            fontSize: "14px",
            fontWeight: "600",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#39ff14";
            e.currentTarget.style.boxShadow =
              "0 0 0 2px rgba(57, 255, 20, 0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#1a1f3a";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0",
            borderTop: "1px solid #1a1f3a",
            fontSize: "13px",
          }}
        >
          <span
            style={{
              color: "#64748b",
            }}
          >
            Total Stake
          </span>
          <span
            style={{
              color: "#e2e8f0",
              fontWeight: "600",
            }}
          >
            ${totalStake.toFixed(2)}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0",
            borderTop: "1px solid #1a1f3a",
            fontSize: "13px",
          }}
        >
          <span
            style={{
              color: "#64748b",
            }}
          >
            Potential Return
          </span>
          <span
            style={{
              color: "#22c55e",
              fontWeight: "600",
              fontSize: "16px",
            }}
          >
            ${potentialReturn.toFixed(2)}
          </span>
        </div>
      </div>

      <Button variant="primary" style={{ width: "100%" }}>
        Lock In Bet
      </Button>

      <Button variant="secondary" onClick={clearAll} style={{ width: "100%" }}>
        Clear All
      </Button>
    </div>
  );
};

export default Betslip;
