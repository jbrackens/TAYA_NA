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

  // Load balance on mount — guard against empty userId (before auth resolves).
  // Without the guard, `${userId}` expands to "" and produces malformed URLs
  // like /api/v1/wallet//ledger (double slash → 308 → 403) or
  // /api/v1/wallets//transactions (404). Wait for user to load.
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    const load = async () => {
      try {
        const bal = await getBalance(userId);
        setBalance(bal);
        dispatch(setCurrentBalance(bal.availableBalance));
      } catch {
        /* API not available yet */
      }
      try {
        const txns = await getTransactions(userId, { limit: 10 });
        setTransactions(txns.transactions || []);
      } catch {}
      try {
        const total = await getMonthlyDepositTotal(userId);
        setMonthlyTotal(total);
      } catch {}
    };
    load();
  }, [dispatch, user?.id]);

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
              ${balance ? balance.availableBalance.toFixed(2) : "0.00"}
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
                color: "var(--t1)",
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 14,
                letterSpacing: "-0.01em",
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
                    color: "var(--t3)",
                    fontSize: 10,
                    fontWeight: 700,
                    marginTop: 22,
                    marginBottom: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Recent transactions
                </h4>
                {transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.transactionId}
                    className="cashier-summary-row"
                    style={{ fontSize: 12 }}
                  >
                    <span
                      style={{
                        color:
                          tx.type === "deposit" ? "var(--yes)" : "var(--no)",
                        fontWeight: 600,
                      }}
                    >
                      {tx.type === "deposit" ? "+" : "−"}${tx.amount.toFixed(2)}
                    </span>
                    <span style={{ color: "var(--t3)" }}>
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
  .cashier-page { max-width: 1100px; margin: 0 auto; padding: 24px 24px 60px; }
  .cashier-title { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; color: var(--t1); margin: 0 0 16px; }
  .cashier-balance-banner {
    display: flex; justify-content: space-between; align-items: center;
    background: var(--s1);
    border: 1px solid var(--b1); border-radius: var(--r-md); padding: 20px 22px; margin-bottom: 16px;
  }
  .cashier-balance-label {
    display: block; font-size: 10px; color: var(--t3); font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px;
  }
  .cashier-balance-value {
    font-size: 28px; font-weight: 700; color: var(--accent); letter-spacing: -0.01em;
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums;
  }
  .cashier-balance-sub {
    display: block; font-size: 16px; font-weight: 600; color: var(--t2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums;
  }
  .cashier-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
  @media (max-width: 768px) { .cashier-grid { grid-template-columns: 1fr; } }
  .cashier-card {
    background: var(--s1); border: 1px solid var(--b1); border-radius: var(--r-md); padding: 22px;
  }
  .cashier-tabs {
    display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid var(--b1);
  }
  .cashier-tab {
    flex: 1; padding: 10px 14px; text-align: center; font-family: inherit; font-size: 13px; font-weight: 600;
    color: var(--t3); background: transparent; border: 0; border-bottom: 2px solid transparent;
    margin-bottom: -1px; cursor: pointer; transition: color 0.15s, border-color 0.15s;
  }
  .cashier-tab:hover { color: var(--t1); }
  .cashier-tab.active { color: var(--t1); border-bottom-color: var(--accent); }
  .cashier-section { margin-bottom: 20px; }
  .cashier-label {
    display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--t3); margin-bottom: 10px;
  }
  .cashier-quick-amounts { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
  .cashier-quick-btn {
    flex: 1; min-width: 60px; padding: 10px 8px; border-radius: var(--r-sm); font-size: 13px;
    font-weight: 600; background: var(--s2); border: 1px solid var(--b1); color: var(--t2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums;
    cursor: pointer; transition: all 0.15s;
  }
  .cashier-quick-btn:hover { border-color: var(--b2); color: var(--t1); }
  .cashier-quick-btn.active {
    background: var(--accent-soft); border-color: var(--accent); color: var(--accent);
  }
  .cashier-input {
    width: 100%; padding: 11px 14px; border-radius: var(--r-sm); font-size: 14px;
    background: var(--s2); border: 1px solid var(--b1); color: var(--t1);
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums;
    outline: none; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .cashier-input::placeholder { color: var(--t4); font-family: inherit; }
  .cashier-input:focus { border-color: var(--accent); box-shadow: var(--accent-glow); }
  .cashier-payment-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; }
  .cashier-payment-btn {
    padding: 11px 8px; border-radius: var(--r-sm); font-family: inherit; font-size: 12px; font-weight: 600;
    background: var(--s2); border: 1px solid var(--b1); color: var(--t2); cursor: pointer;
    transition: all 0.15s;
  }
  .cashier-payment-btn:hover { border-color: var(--b2); color: var(--t1); }
  .cashier-payment-btn.active {
    background: var(--accent-soft); border-color: var(--accent); color: var(--accent);
  }
  .cashier-msg {
    padding: 10px 12px; border-radius: var(--r-sm); font-size: 13px; font-weight: 500; margin-bottom: 14px;
  }
  .cashier-msg.error {
    background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3); color: var(--no);
  }
  .cashier-msg.success {
    background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.3); color: var(--yes);
  }
  .cashier-msg.pending {
    background: var(--accent-soft); border: 1px solid rgba(34,211,238,0.3); color: var(--accent);
    display: flex; align-items: center; gap: 10px;
  }
  @keyframes cashier-spin { to { transform: rotate(360deg); } }
  .cashier-spinner {
    display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(34,211,238,0.3);
    border-top-color: var(--accent); border-radius: 50%;
    animation: cashier-spin 0.8s linear infinite; flex-shrink: 0;
  }
  .cashier-submit {
    width: 100%; padding: 12px 16px; border-radius: var(--r-sm); font-family: inherit;
    font-size: 14px; font-weight: 700; letter-spacing: 0.02em;
    background: var(--accent); border: 0; color: #06222b; cursor: pointer;
    box-shadow: var(--accent-glow); transition: background 0.15s;
  }
  .cashier-submit:hover:not(:disabled) { background: var(--accent-hi); }
  .cashier-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .cashier-summary { height: fit-content; }
  .cashier-summary-row {
    display: flex; justify-content: space-between; padding: 9px 0;
    border-bottom: 1px solid var(--b1); font-size: 13px; color: var(--t2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums;
  }
  .cashier-summary-row:last-child { border-bottom: 0; }
  .cashier-summary-row.total {
    margin-top: 6px; padding-top: 12px; border-top: 1px solid var(--b2); border-bottom: 0;
    font-size: 15px; font-weight: 700; color: var(--accent);
  }
`;
