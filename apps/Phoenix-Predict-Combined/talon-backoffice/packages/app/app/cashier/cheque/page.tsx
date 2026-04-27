"use client";

import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { withdraw } from "../../lib/api/wallet-client";

export default function ChequeWithdrawalPage() {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      setError("User not authenticated");
      return;
    }

    if (!amount || !payeeName || !address) {
      setError("Please fill in all required fields");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await withdraw(user.id, {
        amount: amountNum,
        payment_method: "cheque",
      });

      setSuccess(true);
      setAmount("");
      setPayeeName("");
      setAddress("");

      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Withdrawal failed";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    padding: "24px",
    background: "var(--bg-deep)",
  };

  const contentStyle: React.CSSProperties = {
    maxWidth: "600px",
    margin: "0 auto",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "28px",
    fontWeight: "700",
    color: "var(--t1)",
    marginBottom: "32px",
  };

  const formStyle: React.CSSProperties = {
    backgroundColor: "var(--surface-1)",
    border: "1px solid var(--border-1)",
    borderRadius: "var(--r-rh-lg)",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  };

  const formGroupStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--t2)",
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px 12px",
    backgroundColor: "var(--surface-2)",
    border: "1px solid var(--border-1)",
    borderRadius: "var(--r-rh-md)",
    color: "var(--t1)",
    fontSize: "13px",
    fontFamily: "inherit",
    outline: "none",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: "100px",
    fontFamily: "inherit",
    resize: "vertical",
  };

  const submitButtonStyle: React.CSSProperties = {
    padding: "12px 16px",
    backgroundColor: "var(--accent)",
    color: "#04140a",
    border: "none",
    borderRadius: "var(--r-rh-md)",
    fontWeight: "600",
    fontSize: "14px",
    cursor: loading ? "not-allowed" : "pointer",
    transition: "transform 0.15s, filter 0.15s",
    opacity: loading ? 0.6 : 1,
  };

  const errorStyle: React.CSSProperties = {
    padding: "12px 16px",
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    border: "1px solid var(--no)",
    borderRadius: "var(--r-rh-md)",
    color: "var(--no)",
    fontSize: "13px",
  };

  const successStyle: React.CSSProperties = {
    padding: "12px 16px",
    backgroundColor: "var(--accent-soft)",
    border: "1px solid var(--border-2)",
    borderRadius: "var(--r-rh-md)",
    color: "var(--accent)",
    fontSize: "13px",
  };

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <h1 style={titleStyle}>Cheque Withdrawal</h1>

        <div style={formStyle}>
          {error && <div style={errorStyle}>{error}</div>}
          {success && (
            <div style={successStyle}>
              Withdrawal request submitted successfully. Please allow 5-7
              business days for processing.
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div style={formGroupStyle}>
              <label style={labelStyle}>Amount (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.boxShadow = "0 0 0 2px var(--accent-soft)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                disabled={loading}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Payee Name</label>
              <input
                type="text"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder="Name on cheque"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.boxShadow = "0 0 0 2px var(--accent-soft)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                disabled={loading}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Mailing Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full mailing address"
                style={textareaStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.boxShadow = "0 0 0 2px var(--accent-soft)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={submitButtonStyle}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.filter = "brightness(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = "none";
              }}
            >
              {loading ? "Processing..." : "Request Cheque"}
            </button>
          </form>

          <div
            style={{ fontSize: "12px", color: "var(--t3)", marginTop: "16px" }}
          >
            <p style={{ margin: "0 0 8px 0" }}>
              Cheque withdrawals typically take 5-7 business days to arrive.
            </p>
            <p style={{ margin: 0 }}>
              A fee may apply depending on your withdrawal amount.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
