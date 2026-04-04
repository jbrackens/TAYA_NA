"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getBalance,
  deposit,
  withdraw,
  getTransactions,
  getTransactionStatus,
} from "../lib/api/wallet-client";
import { Balance, Transaction } from "../lib/api/wallet-client";
import { logger } from "../lib/logger";
import { getMonthlyDepositTotal } from "../lib/api/compliance-client";
import { useAppDispatch } from "../lib/store/hooks";
import { setCurrentBalance } from "../lib/store/cashierSlice";
import { useToast } from "../components/ToastProvider";
import { useAuth } from "../hooks/useAuth";
import DepositThresholdModal from "../components/DepositThresholdModal";

const QUICK_AMOUNTS = ["10", "25", "50", "100", "250", "500"];
const PAYMENT_METHODS = [
  { id: "card", label: "Credit Card" },
  { id: "bank", label: "Bank Transfer" },
  { id: "wallet", label: "E-Wallet" },
  { id: "crypto", label: "Crypto" },
];

export default function CashierPage() {
  const [activeTab, setActiveTab] = useState<"deposit" | "withdrawal">(
    "deposit",
  );
  const [amount, setAmount] = useState("50");
  const [selectedQuick, setSelectedQuick] = useState("50");
  const [selectedPayment, setSelectedPayment] = useState("card");
  const [balance, setBalance] = useState<Balance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
  const [pollMessage, setPollMessage] = useState("");
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Store is always available via StoreProvider in layout.tsx
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { user } = useAuth();

  // Load balance on mount
  useEffect(() => {
    const load = async () => {
      try {
        const bal = await getBalance(user?.id || "");
        setBalance(bal);
        dispatch(setCurrentBalance(bal.availableBalance));
      } catch {
        /* API not available yet */
      }
      try {
        const txns = await getTransactions(user?.id || "", { limit: 10 });
        setTransactions(txns.transactions || []);
      } catch {}
      try {
        const total = await getMonthlyDepositTotal(user?.id || "");
        setMonthlyTotal(total);
      } catch {}
    };
    load();
  }, [dispatch]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const startPolling = useCallback(
    (txId: string) => {
      setPendingTxId(txId);
      setPollMessage("Processing deposit...");
      setLoading(true);
      let retries = 0;
      const maxRetries = 30;

      pollIntervalRef.current = setInterval(async () => {
        retries += 1;
        try {
          const statusRes = await getTransactionStatus(txId);
          logger.info("Cashier", "Poll transaction status", {
            txId,
            status: statusRes.status,
            retry: retries,
          });

          if (statusRes.status === "COMPLETED") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setPendingTxId(null);
            setPollMessage("");
            const successMsg = `$${statusRes.amount.toFixed(
              2,
            )} deposited successfully!`;
            setSuccess(successMsg);
            toast.success("Deposit Successful", successMsg);
            setLoading(false);
            try {
              const bal = await getBalance(user?.id || "");
              setBalance(bal);
              dispatch(setCurrentBalance(bal.availableBalance));
            } catch (err) {
              logger.error(
                "Cashier",
                "Failed to refresh balance after polling",
                err,
              );
            }
            setTimeout(() => {
              setSuccess("");
              setError("");
            }, 4000);
            return;
          }

          if (statusRes.status === "FAILED") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setPendingTxId(null);
            setPollMessage("");
            const errorMsg = "Deposit failed. Please try again.";
            setError(errorMsg);
            toast.error("Deposit Failed", errorMsg);
            setLoading(false);
            setTimeout(() => {
              setSuccess("");
              setError("");
            }, 4000);
            return;
          }
        } catch (err) {
          logger.error("Cashier", "Error polling transaction status", err);
        }

        if (retries >= maxRetries) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setPendingTxId(null);
          setPollMessage("");
          const timeoutMsg =
            "Transaction still processing. Check your history.";
          setSuccess(timeoutMsg);
          toast.info("Deposit Processing", timeoutMsg);
          setLoading(false);
          setTimeout(() => {
            setSuccess("");
            setError("");
          }, 4000);
        }
      }, 2000);
    },
    [dispatch, toast, user],
  );

  const handleQuickAmount = (val: string) => {
    setSelectedQuick(val);
    setAmount(val);
  };

  const DEPOSIT_THRESHOLD = 2500;

  const executeDeposit = useCallback(async () => {
    const numAmount = parseFloat(amount);
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const depositRes = await deposit(user?.id || "", {
        amount: numAmount,
        payment_method: selectedPayment,
      });
      setMonthlyTotal((prev) => prev + numAmount);

      // Handle payment gateway redirect flow
      if (depositRes.requiresRedirect && depositRes.redirectUrl) {
        logger.info(
          "Cashier",
          "Deposit requires redirect to payment gateway",
          depositRes.redirectUrl,
        );
        window.open(depositRes.redirectUrl, "payment", "width=600,height=800");
        startPolling(depositRes.transactionId);
        return;
      }

      if (depositRes.status === "PENDING") {
        logger.info(
          "Cashier",
          "Deposit returned PENDING, starting poll",
          depositRes.transactionId,
        );
        startPolling(depositRes.transactionId);
        return;
      }

      const successMsg = `$${numAmount.toFixed(2)} deposited successfully!`;
      setSuccess(successMsg);
      toast.success("Deposit Successful", successMsg);
      const bal = await getBalance(user?.id || "");
      setBalance(bal);
      dispatch(setCurrentBalance(bal.availableBalance));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Deposit failed. Please try again.");
      toast.error("Deposit Failed", message);
    } finally {
      if (!pendingTxId) {
        setLoading(false);
      }
      setTimeout(() => {
        if (!pendingTxId) {
          setSuccess("");
          setError("");
        }
      }, 4000);
    }
  }, [
    amount,
    selectedPayment,
    dispatch,
    toast,
    user,
    startPolling,
    pendingTxId,
  ]);

  const handleSubmit = useCallback(async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    // Check deposit threshold for deposits
    if (
      activeTab === "deposit" &&
      monthlyTotal + numAmount > DEPOSIT_THRESHOLD
    ) {
      setShowThresholdModal(true);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (activeTab === "deposit") {
        const depositRes = await deposit(user?.id || "", {
          amount: numAmount,
          payment_method: selectedPayment,
        });

        // Handle payment gateway redirect flow
        if (depositRes.requiresRedirect && depositRes.redirectUrl) {
          logger.info(
            "Cashier",
            "Deposit requires redirect to payment gateway",
            depositRes.redirectUrl,
          );
          window.open(
            depositRes.redirectUrl,
            "payment",
            "width=600,height=800",
          );
          startPolling(depositRes.transactionId);
          return;
        }

        if (depositRes.status === "PENDING") {
          logger.info(
            "Cashier",
            "Deposit returned PENDING, starting poll",
            depositRes.transactionId,
          );
          startPolling(depositRes.transactionId);
          return;
        }

        const successMsg = `$${numAmount.toFixed(2)} deposited successfully!`;
        setSuccess(successMsg);
        toast.success("Deposit Successful", successMsg);
      } else {
        await withdraw(user?.id || "", {
          amount: numAmount,
          payment_method: selectedPayment,
        });
        const successMsg = `$${numAmount.toFixed(2)} withdrawal submitted!`;
        setSuccess(successMsg);
        toast.success("Withdrawal Submitted", successMsg);
      }
      // Refresh balance
      const bal = await getBalance(user?.id || "");
      setBalance(bal);
      dispatch(setCurrentBalance(bal.availableBalance));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const errorMsg = message || "Transaction failed. Please try again.";
      setError(errorMsg);
      toast.error("Transaction Failed", errorMsg);
    } finally {
      if (!pendingTxId) {
        setLoading(false);
      }
      setTimeout(() => {
        if (!pendingTxId) {
          setSuccess("");
          setError("");
        }
      }, 4000);
    }
  }, [
    amount,
    activeTab,
    selectedPayment,
    dispatch,
    toast,
    user,
    monthlyTotal,
    executeDeposit,
    startPolling,
    pendingTxId,
  ]);

  const displayAmount = parseFloat(amount || "0");
  const fee = displayAmount * 0.02;
  const total =
    activeTab === "deposit" ? displayAmount + fee : displayAmount - fee;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cashierStyles }} />
      <div className="cashier-page">
        <h1 className="cashier-title">Cashier</h1>

        {/* Balance banner */}
        <div className="cashier-balance-banner">
          <div>
            <span className="cashier-balance-label">Available Balance</span>
            <span className="cashier-balance-value">
              ${balance ? balance.availableBalance.toFixed(2) : "—"}
            </span>
          </div>
          {balance && (
            <div style={{ textAlign: "right" }}>
              <span className="cashier-balance-label">Reserved</span>
              <span className="cashier-balance-sub">
                ${balance.reservedBalance.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="cashier-grid">
          {/* Main form */}
          <div className="cashier-card">
            {/* Tabs */}
            <div className="cashier-tabs">
              <button
                className={`cashier-tab ${
                  activeTab === "deposit" ? "active" : ""
                }`}
                onClick={() => setActiveTab("deposit")}
              >
                Deposit
              </button>
              <button
                className={`cashier-tab ${
                  activeTab === "withdrawal" ? "active" : ""
                }`}
                onClick={() => setActiveTab("withdrawal")}
              >
                Withdrawal
              </button>
            </div>

            {/* Quick amounts */}
            <div className="cashier-section">
              <label className="cashier-label">Amount</label>
              <div className="cashier-quick-amounts">
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    className={`cashier-quick-btn ${
                      selectedQuick === val ? "active" : ""
                    }`}
                    onClick={() => handleQuickAmount(val)}
                  >
                    ${val}
                  </button>
                ))}
              </div>
              <input
                type="number"
                className="cashier-input"
                placeholder="Or enter custom amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setSelectedQuick("");
                }}
                min="1"
                step="0.01"
              />
            </div>

            {/* Payment methods */}
            <div className="cashier-section">
              <label className="cashier-label">
                {activeTab === "deposit"
                  ? "Payment Method"
                  : "Withdrawal Method"}
              </label>
              <div className="cashier-payment-grid">
                {PAYMENT_METHODS.filter(
                  (m) => activeTab === "deposit" || m.id !== "card",
                ).map((m) => (
                  <button
                    key={m.id}
                    className={`cashier-payment-btn ${
                      selectedPayment === m.id ? "active" : ""
                    }`}
                    onClick={() => setSelectedPayment(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            {pendingTxId && (
              <div className="cashier-msg pending">
                <span className="cashier-spinner" />
                {pollMessage}
              </div>
            )}
            {error && <div className="cashier-msg error">{error}</div>}
            {success && <div className="cashier-msg success">{success}</div>}

            {/* Submit */}
            <button
              className="cashier-submit"
              onClick={handleSubmit}
              disabled={loading || displayAmount <= 0 || !!pendingTxId}
            >
              {pendingTxId
                ? "Processing deposit..."
                : loading
                ? "Processing..."
                : activeTab === "deposit"
                ? `Deposit $${displayAmount.toFixed(2)}`
                : `Withdraw $${displayAmount.toFixed(2)}`}
            </button>
          </div>

          {/* Summary sidebar */}
          <div className="cashier-card cashier-summary">
            <h3
              style={{
                color: "#f1f5f9",
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              Summary
            </h3>
            <div className="cashier-summary-row">
              <span>Amount</span>
              <span>${displayAmount.toFixed(2)}</span>
            </div>
            <div className="cashier-summary-row">
              <span>Fee (2%)</span>
              <span>${fee.toFixed(2)}</span>
            </div>
            <div className="cashier-summary-row total">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>

            {/* Recent transactions */}
            {transactions.length > 0 && (
              <>
                <h4
                  style={{
                    color: "#94a3b8",
                    fontSize: 12,
                    fontWeight: 600,
                    marginTop: 24,
                    marginBottom: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Recent Transactions
                </h4>
                {transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.transactionId}
                    className="cashier-summary-row"
                    style={{ fontSize: 12 }}
                  >
                    <span
                      style={{
                        color: tx.type === "deposit" ? "#22c55e" : "#f87171",
                      }}
                    >
                      {tx.type === "deposit" ? "+" : "-"}${tx.amount.toFixed(2)}
                    </span>
                    <span style={{ color: "#4a5580" }}>
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <DepositThresholdModal
        open={showThresholdModal}
        onClose={() => setShowThresholdModal(false)}
        onConfirm={() => {
          setShowThresholdModal(false);
          executeDeposit();
        }}
        amount={monthlyTotal + parseFloat(amount || "0")}
        currentLimit={DEPOSIT_THRESHOLD}
      />
    </>
  );
}

const cashierStyles = `
  .cashier-page { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
  .cashier-title { font-size: 24px; font-weight: 800; color: #f8fafc; margin-bottom: 20px; }
  .cashier-balance-banner {
    display: flex; justify-content: space-between; align-items: center;
    background: linear-gradient(135deg, #1a1040 0%, #111328 100%);
    border: 1px solid #1e2243; border-radius: 14px; padding: 20px 24px; margin-bottom: 20px;
  }
  .cashier-balance-label { display: block; font-size: 12px; color: #4a5580; font-weight: 600; margin-bottom: 4px; }
  .cashier-balance-value { font-size: 28px; font-weight: 800; color: #f97316; }
  .cashier-balance-sub { display: block; font-size: 16px; font-weight: 600; color: #64748b; }
  .cashier-grid { display: grid; grid-template-columns: 1fr 300px; gap: 16px; }
  @media (max-width: 768px) { .cashier-grid { grid-template-columns: 1fr; } }
  .cashier-card { background: #111328; border: 1px solid #1a1f3a; border-radius: 14px; padding: 24px; }
  .cashier-tabs { display: flex; gap: 0; margin-bottom: 24px; border-bottom: 1px solid #1a1f3a; }
  .cashier-tab {
    flex: 1; padding: 12px; text-align: center; font-size: 14px; font-weight: 600;
    color: #4a5580; background: none; border: none; cursor: pointer;
    border-bottom: 2px solid transparent; transition: all 0.15s;
  }
  .cashier-tab.active { color: #f97316; border-bottom-color: #f97316; }
  .cashier-section { margin-bottom: 24px; }
  .cashier-label { display: block; font-size: 13px; font-weight: 600; color: #94a3b8; margin-bottom: 10px; }
  .cashier-quick-amounts { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
  .cashier-quick-btn {
    flex: 1; min-width: 60px; padding: 10px 8px; border-radius: 8px; font-size: 13px;
    font-weight: 700; background: #161a35; border: 1px solid #1e2243; color: #64748b;
    cursor: pointer; transition: all 0.12s;
  }
  .cashier-quick-btn.active, .cashier-quick-btn:hover {
    background: rgba(249,115,22,0.1); border-color: #f97316; color: #f97316;
  }
  .cashier-input {
    width: 100%; padding: 12px 14px; border-radius: 8px; font-size: 14px;
    background: #0b0e1c; border: 1px solid #1e2243; color: #f1f5f9;
    outline: none; transition: border-color 0.15s;
  }
  .cashier-input:focus { border-color: #f97316; }
  .cashier-payment-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; }
  .cashier-payment-btn {
    padding: 12px 8px; border-radius: 8px; font-size: 12px; font-weight: 600;
    background: #161a35; border: 1px solid #1e2243; color: #64748b; cursor: pointer;
    transition: all 0.12s;
  }
  .cashier-payment-btn.active, .cashier-payment-btn:hover {
    background: rgba(249,115,22,0.1); border-color: #f97316; color: #f97316;
  }
  .cashier-msg { padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; margin-bottom: 16px; }
  .cashier-msg.error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #f87171; }
  .cashier-msg.success { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2); color: #22c55e; }
  .cashier-msg.pending { background: rgba(249,115,22,0.08); border: 1px solid rgba(249,115,22,0.2); color: #f97316; display: flex; align-items: center; gap: 10px; }
  @keyframes cashier-spin { to { transform: rotate(360deg); } }
  .cashier-spinner {
    display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(249,115,22,0.3);
    border-top-color: #f97316; border-radius: 50%; animation: cashier-spin 0.8s linear infinite; flex-shrink: 0;
  }
  .cashier-submit {
    width: 100%; padding: 14px; border-radius: 10px; font-size: 15px; font-weight: 700;
    background: #f97316; border: none; color: #fff; cursor: pointer; transition: opacity 0.15s;
  }
  .cashier-submit:hover { opacity: 0.9; }
  .cashier-submit:disabled { opacity: 0.4; cursor: not-allowed; }
  .cashier-summary { height: fit-content; }
  .cashier-summary-row {
    display: flex; justify-content: space-between; padding: 10px 0;
    border-bottom: 1px solid #1a1f3a; font-size: 13px; color: #94a3b8;
  }
  .cashier-summary-row:last-child { border-bottom: none; }
  .cashier-summary-row.total {
    margin-top: 8px; padding-top: 12px; border-top: 2px solid #1e2243;
    font-size: 16px; font-weight: 700; color: #f97316;
  }
`;
