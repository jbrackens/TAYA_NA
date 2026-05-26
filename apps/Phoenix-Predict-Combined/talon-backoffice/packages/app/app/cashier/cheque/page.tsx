"use client";

import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { withdraw } from "../../lib/api/wallet-client";

const pageClass = "min-h-screen bg-[var(--bg-deep)] p-6";
const contentClass = "mx-auto max-w-[600px]";
const titleClass = "mb-8 text-[28px] font-bold text-[var(--t1)]";
const panelClass =
  "flex flex-col gap-4 rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-6";
const formClass = "flex flex-col gap-4";
const formGroupClass = "flex flex-col gap-1.5";
const labelClass = "text-[13px] font-semibold text-[var(--t2)]";
const inputClass =
  "box-border w-full rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-2.5 text-[13px] text-[var(--t1)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_2px_var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60 [font-family:inherit]";
const textareaClass = `${inputClass} min-h-[100px] resize-y`;
const submitButtonClass =
  "rounded-[var(--r-rh-md)] border-0 bg-[var(--accent)] px-4 py-3 text-[14px] font-semibold text-[#04140a] transition-[filter,transform] duration-150 enabled:cursor-pointer enabled:hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-60";
const errorClass =
  "rounded-[var(--r-rh-md)] border border-[var(--no)] bg-[rgba(244,63,94,0.1)] px-4 py-3 text-[13px] text-[var(--no)]";
const successClass =
  "rounded-[var(--r-rh-md)] border border-[var(--border-2)] bg-[var(--accent-soft)] px-4 py-3 text-[13px] text-[var(--accent)]";
const noteClass = "mt-4 text-[12px] text-[var(--t3)]";

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

  return (
    <div className={pageClass}>
      <div className={contentClass}>
        <h1 className={titleClass}>Cheque Withdrawal</h1>

        <div className={panelClass}>
          {error && <div className={errorClass}>{error}</div>}
          {success && (
            <div className={successClass}>
              Withdrawal request submitted successfully. Please allow 5-7
              business days for processing.
            </div>
          )}

          <form onSubmit={handleSubmit} className={formClass}>
            <div className={formGroupClass}>
              <label className={labelClass}>Amount (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className={inputClass}
                disabled={loading}
              />
            </div>

            <div className={formGroupClass}>
              <label className={labelClass}>Payee Name</label>
              <input
                type="text"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder="Name on cheque"
                className={inputClass}
                disabled={loading}
              />
            </div>

            <div className={formGroupClass}>
              <label className={labelClass}>Mailing Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full mailing address"
                className={textareaClass}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={submitButtonClass}
            >
              {loading ? "Processing..." : "Request Cheque"}
            </button>
          </form>

          <div className={noteClass}>
            <p className="m-0 mb-2">
              Cheque withdrawals typically take 5-7 business days to arrive.
            </p>
            <p className="m-0">
              A fee may apply depending on your withdrawal amount.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
