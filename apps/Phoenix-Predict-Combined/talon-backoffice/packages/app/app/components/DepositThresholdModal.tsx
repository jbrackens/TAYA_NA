"use client";

import React from "react";
import Modal from "./Modal";

interface DepositThresholdModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
  currentLimit: number;
}

export default function DepositThresholdModal({
  open,
  onClose,
  onConfirm,
  amount,
  currentLimit,
}: DepositThresholdModalProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const isExceeding = amount > currentLimit;

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  };

  const warningBoxStyle: React.CSSProperties = {
    padding: "12px",
    backgroundColor: isExceeding
      ? "rgba(239, 68, 68, 0.1)"
      : "rgba(43, 228, 128, 0.1)",
    border: `1px solid ${isExceeding ? "#ef4444" : "var(--accent)"}`,
    borderRadius: "4px",
    color: isExceeding ? "#fecaca" : "#fed7aa",
    fontSize: "13px",
  };

  const detailsStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  };

  const detailRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 12px",
    backgroundColor: "#0a0e18",
    borderRadius: "4px",
    fontSize: "13px",
  };

  const labelStyle: React.CSSProperties = {
    color: "#64748b",
  };

  const valueStyle: React.CSSProperties = {
    color: "#e2e8f0",
    fontWeight: "600",
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
  };

  const continueButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: "10px 16px",
    backgroundColor: "var(--accent)",
    color: "#0f1225",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
    transition: "all 0.2s",
  };

  const cancelButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: "10px 16px",
    backgroundColor: "transparent",
    border: "1px solid #64748b",
    color: "#64748b",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
    transition: "all 0.2s",
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Deposit Limit Warning"
      maxWidth={400}
    >
      <div style={containerStyle}>
        <div style={warningBoxStyle}>
          {isExceeding
            ? "Your deposit amount exceeds your current limit. Please confirm to proceed."
            : "Your deposit amount is approaching your deposit limit. Please review before confirming."}
        </div>

        <div style={detailsStyle}>
          <div style={detailRowStyle}>
            <span style={labelStyle}>Current Daily Limit:</span>
            <span style={valueStyle}>{formatCurrency(currentLimit)}</span>
          </div>
          <div style={detailRowStyle}>
            <span style={labelStyle}>Requested Deposit:</span>
            <span style={valueStyle}>{formatCurrency(amount)}</span>
          </div>
          <div
            style={{
              ...detailRowStyle,
              borderTop: "1px solid #1a1f3a",
              backgroundColor: isExceeding
                ? "rgba(239, 68, 68, 0.05)"
                : "#0a0e18",
            }}
          >
            <span style={labelStyle}>Difference:</span>
            <span
              style={{
                ...valueStyle,
                color: isExceeding ? "var(--no)" : "#cbd5e1",
              }}
            >
              {isExceeding ? "+" : "-"}
              {formatCurrency(Math.abs(amount - currentLimit))}
            </span>
          </div>
        </div>

        <div style={buttonGroupStyle}>
          <button
            onClick={onConfirm}
            style={continueButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#ea580c";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--accent)";
            }}
          >
            Continue
          </button>
          <button
            onClick={onClose}
            style={cancelButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgba(100, 116, 139, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
