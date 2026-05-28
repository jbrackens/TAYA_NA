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
import CryptoDepositCard from "../components/CryptoDepositCard";
import CashierCanaryPanel from "../components/CashierCanaryPanel";

const QUICK_AMOUNTS = ["10", "25", "50", "100", "250", "500"];
const PAYMENT_METHODS = [
  { id: "card", label: "Credit Card" },
  { id: "bank", label: "Bank Transfer" },
  { id: "wallet", label: "E-Wallet" },
  { id: "crypto", label: "Crypto" },
];

const childCashierClasses = `
  [&_.cashier-section]:mb-5
  [&_.cashier-label]:mb-2.5 [&_.cashier-label]:block [&_.cashier-label]:text-[10px] [&_.cashier-label]:font-bold [&_.cashier-label]:uppercase [&_.cashier-label]:tracking-[0.08em] [&_.cashier-label]:text-[var(--t3)]
  [&_.cashier-msg]:mb-[14px] [&_.cashier-msg]:rounded-[var(--r-sm)] [&_.cashier-msg]:px-3 [&_.cashier-msg]:py-2.5 [&_.cashier-msg]:text-[13px] [&_.cashier-msg]:font-medium
  [&_.cashier-msg.error]:border [&_.cashier-msg.error]:border-[rgba(255,155,107,0.3)] [&_.cashier-msg.error]:bg-[rgba(255,155,107,0.1)] [&_.cashier-msg.error]:text-[var(--no-text)]
  [&_.cashier-msg.success]:border [&_.cashier-msg.success]:border-[rgba(127,200,255,0.3)] [&_.cashier-msg.success]:bg-[rgba(127,200,255,0.1)] [&_.cashier-msg.success]:text-[var(--yes-text)]
  [&_.cashier-msg.pending]:flex [&_.cashier-msg.pending]:items-center [&_.cashier-msg.pending]:gap-2.5 [&_.cashier-msg.pending]:border [&_.cashier-msg.pending]:border-[rgba(43,228,128,0.3)] [&_.cashier-msg.pending]:bg-[var(--accent-soft)] [&_.cashier-msg.pending]:text-[var(--accent)]
  [&_.cashier-quick-btn]:min-w-[60px] [&_.cashier-quick-btn]:cursor-pointer [&_.cashier-quick-btn]:rounded-[var(--r-sm)] [&_.cashier-quick-btn]:border [&_.cashier-quick-btn]:border-[var(--b1)] [&_.cashier-quick-btn]:bg-[var(--s2)] [&_.cashier-quick-btn]:px-2 [&_.cashier-quick-btn]:py-2.5 [&_.cashier-quick-btn]:font-mono [&_.cashier-quick-btn]:text-[13px] [&_.cashier-quick-btn]:font-semibold [&_.cashier-quick-btn]:text-[var(--t2)] [&_.cashier-quick-btn]:tabular-nums [&_.cashier-quick-btn]:transition-all [&_.cashier-quick-btn]:duration-150 [&_.cashier-quick-btn:hover]:border-[var(--b2)] [&_.cashier-quick-btn:hover]:text-[var(--t1)]
  [&_.cashier-balance-sub]:block [&_.cashier-balance-sub]:font-mono [&_.cashier-balance-sub]:text-base [&_.cashier-balance-sub]:font-semibold [&_.cashier-balance-sub]:text-[var(--t2)] [&_.cashier-balance-sub]:tabular-nums
  [&_.cashier-status-panel]:mb-[18px] [&_.cashier-status-panel]:rounded-[var(--r-sm)] [&_.cashier-status-panel]:border [&_.cashier-status-panel]:border-[var(--b1)] [&_.cashier-status-panel]:bg-[var(--s2)] [&_.cashier-status-panel]:p-[14px]
  [&_.cashier-status-head]:mb-3 [&_.cashier-status-head]:flex [&_.cashier-status-head]:items-center [&_.cashier-status-head]:justify-between [&_.cashier-status-head]:gap-3
  [&_.cashier-status-pill]:rounded-full [&_.cashier-status-pill]:border [&_.cashier-status-pill]:border-[rgba(43,228,128,0.3)] [&_.cashier-status-pill]:bg-[var(--accent-soft)] [&_.cashier-status-pill]:px-[7px] [&_.cashier-status-pill]:py-1 [&_.cashier-status-pill]:font-mono [&_.cashier-status-pill]:text-[10px] [&_.cashier-status-pill]:font-bold [&_.cashier-status-pill]:uppercase [&_.cashier-status-pill]:text-[var(--accent)]
  [&_.cashier-timeline]:grid [&_.cashier-timeline]:gap-2.5
  [&_.cashier-timeline-row]:grid [&_.cashier-timeline-row]:grid-cols-[14px_minmax(0,1fr)] [&_.cashier-timeline-row]:items-start [&_.cashier-timeline-row]:gap-2.5 [&_.cashier-timeline-row]:text-[var(--t3)]
  [&_.cashier-timeline-row.done]:text-[var(--t1)] [&_.cashier-timeline-row.active]:text-[var(--t1)]
  [&_.cashier-timeline-dot]:mt-1 [&_.cashier-timeline-dot]:h-[9px] [&_.cashier-timeline-dot]:w-[9px] [&_.cashier-timeline-dot]:rounded-full [&_.cashier-timeline-dot]:bg-[var(--b2)] [&_.cashier-timeline-dot]:shadow-[0_0_0_3px_var(--s1)]
  [&_.cashier-timeline-row.done_.cashier-timeline-dot]:bg-[var(--yes)] [&_.cashier-timeline-row.active_.cashier-timeline-dot]:bg-[var(--accent)]
  [&_.cashier-timeline-label]:text-[13px] [&_.cashier-timeline-label]:font-bold
  [&_.cashier-timeline-detail]:mt-0.5 [&_.cashier-timeline-detail]:text-xs [&_.cashier-timeline-detail]:leading-normal [&_.cashier-timeline-detail]:text-[var(--t3)]
  [&_.cashier-status-note]:mb-0 [&_.cashier-status-note]:mt-[14px]
  [&_.cashier-canary-panel]:mt-5 [&_.cashier-canary-panel]:border-t [&_.cashier-canary-panel]:border-[var(--b1)] [&_.cashier-canary-panel]:pt-4
  [&_.cashier-canary-head]:mb-3 [&_.cashier-canary-head]:flex [&_.cashier-canary-head]:items-center [&_.cashier-canary-head]:justify-between [&_.cashier-canary-head]:gap-3
  [&_.cashier-canary-row]:grid [&_.cashier-canary-row]:grid-cols-[12px_minmax(0,1fr)] [&_.cashier-canary-row]:items-start [&_.cashier-canary-row]:gap-[9px] [&_.cashier-canary-row]:border-b [&_.cashier-canary-row]:border-[var(--b1)] [&_.cashier-canary-row]:py-2 [&_.cashier-canary-row:last-child]:border-b-0
  [&_.cashier-canary-dot]:mt-[5px] [&_.cashier-canary-dot]:h-2 [&_.cashier-canary-dot]:w-2 [&_.cashier-canary-dot]:rounded-full [&_.cashier-canary-dot]:bg-[var(--b2)]
  [&_.cashier-canary-dot.ok]:bg-[var(--yes)] [&_.cashier-canary-dot.warn]:bg-[#ffd166] [&_.cashier-canary-dot.blocked]:bg-[var(--no)]
  [&_.cashier-canary-name]:text-xs [&_.cashier-canary-name]:font-bold [&_.cashier-canary-name]:text-[var(--t2)]
  [&_.cashier-canary-detail]:mt-0.5 [&_.cashier-canary-detail]:text-[11px] [&_.cashier-canary-detail]:leading-snug [&_.cashier-canary-detail]:text-[var(--t3)]
`;

const pageClass = `mx-auto max-w-[1100px] px-6 pb-[60px] pt-6 [--b1:var(--border-1)] [--b2:var(--border-2)] [--s1:var(--surface-1)] [--s2:var(--surface-2)] ${childCashierClasses}`;
const cardClass =
  "rounded-[var(--r-md)] border border-[var(--b1)] bg-[var(--s1)] p-[22px]";
const labelClass =
  "mb-2.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--t3)]";
const summaryRowClass =
  "flex justify-between border-b border-[var(--b1)] py-[9px] font-mono text-[13px] text-[var(--t2)] tabular-nums last:border-b-0";

function tabClass(active: boolean) {
  return `mb-[-1px] flex-1 cursor-pointer border-0 border-b-2 bg-transparent px-[14px] py-2.5 text-center text-[13px] font-semibold transition-colors duration-150 ${
    active
      ? "border-[var(--accent)] text-[var(--t1)]"
      : "border-transparent text-[var(--t3)] hover:text-[var(--t1)]"
  }`;
}

function quickAmountClass(active: boolean) {
  return `min-w-[60px] flex-1 cursor-pointer rounded-[var(--r-sm)] border px-2 py-2.5 font-mono text-[13px] font-semibold tabular-nums transition-all duration-150 ${
    active
      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
      : "border-[var(--b1)] bg-[var(--s2)] text-[var(--t2)] hover:border-[var(--b2)] hover:text-[var(--t1)]"
  }`;
}

function paymentButtonClass(active: boolean) {
  return `cursor-pointer rounded-[var(--r-sm)] border px-2 py-[11px] text-xs font-semibold transition-all duration-150 ${
    active
      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
      : "border-[var(--b1)] bg-[var(--s2)] text-[var(--t2)] hover:border-[var(--b2)] hover:text-[var(--t1)]"
  }`;
}

function messageClass(tone: "pending" | "error" | "success") {
  const base = "mb-[14px] rounded-[var(--r-sm)] px-3 py-2.5 text-[13px] font-medium";
  if (tone === "pending") {
    return `${base} flex items-center gap-2.5 border border-[rgba(43,228,128,0.3)] bg-[var(--accent-soft)] text-[var(--accent)]`;
  }
  if (tone === "error") {
    return `${base} border border-[rgba(255,155,107,0.3)] bg-[rgba(255,155,107,0.1)] text-[var(--no-text)]`;
  }
  return `${base} border border-[rgba(127,200,255,0.3)] bg-[rgba(127,200,255,0.1)] text-[var(--yes-text)]`;
}

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
  const isCryptoDeposit =
    activeTab === "deposit" && selectedPayment === "crypto";
  const isCryptoWithdrawal =
    activeTab === "withdrawal" && selectedPayment === "crypto";
  const isCryptoRail = isCryptoDeposit || isCryptoWithdrawal;

  const refreshBalance = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;
    const bal = await getBalance(userId);
    setBalance(bal);
    dispatch(setCurrentBalance(bal.availableBalance));
  }, [dispatch, user?.id]);

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
    if (isCryptoRail) {
      return;
    }

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
    isCryptoRail,
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
      <div className={pageClass}>
        <h1 className="mb-4 text-[28px] font-extrabold tracking-[-0.02em] text-[var(--t1)]">
          Cashier
        </h1>

        {/* Balance banner */}
        <div className="mb-4 flex items-center justify-between rounded-[var(--r-md)] border border-[var(--b1)] bg-[var(--s1)] px-[22px] py-5">
          <div>
            <span className={labelClass}>Available Balance</span>
            <span className="font-mono text-[28px] font-bold tracking-[-0.01em] text-[var(--accent)] tabular-nums">
              ${balance ? balance.availableBalance.toFixed(2) : "0.00"}
            </span>
          </div>
          {balance && (
            <div className="text-right">
              <span className={labelClass}>Reserved</span>
              <span className="block font-mono text-base font-semibold text-[var(--t2)] tabular-nums">
                ${balance.reservedBalance.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-4 max-[768px]:grid-cols-1">
          {/* Main form */}
          <div className={cardClass}>
            {/* Tabs */}
            <div className="mb-5 flex gap-1 border-b border-[var(--b1)]">
              <button
                className={tabClass(activeTab === "deposit")}
                onClick={() => setActiveTab("deposit")}
              >
                Deposit
              </button>
              <button
                className={tabClass(activeTab === "withdrawal")}
                onClick={() => setActiveTab("withdrawal")}
              >
                Withdrawal
              </button>
            </div>

            <div className="mb-5">
              <label className={labelClass}>Amount</label>
              <div className="mb-2.5 flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    className={quickAmountClass(selectedQuick === val)}
                    onClick={() => handleQuickAmount(val)}
                  >
                    ${val}
                  </button>
                ))}
              </div>
              <input
                type="number"
                className="w-full rounded-[var(--r-sm)] border border-[var(--b1)] bg-[var(--s2)] px-[14px] py-[11px] font-mono text-sm text-[var(--t1)] tabular-nums outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--t4)] focus:border-[var(--accent)] focus:shadow-[0_0_0_2px_var(--accent-soft)]"
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
            <div className="mb-5">
              <label className={labelClass}>
                {activeTab === "deposit"
                  ? "Payment Method"
                  : "Withdrawal Method"}
              </label>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2">
                {PAYMENT_METHODS.filter(
                  (m) => activeTab === "deposit" || m.id !== "card",
                ).map((m) => (
                  <button
                    key={m.id}
                    className={paymentButtonClass(selectedPayment === m.id)}
                    onClick={() => setSelectedPayment(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {isCryptoRail && (
              <CryptoDepositCard
                mode={activeTab}
                amount={displayAmount}
                onBalanceChanged={refreshBalance}
              />
            )}

            {/* Messages */}
            {pendingTxId && (
              <div className={messageClass("pending")}>
                <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[rgba(43,228,128,0.3)] border-t-[var(--accent)]" />
                {pollMessage}
              </div>
            )}
            {error && <div className={messageClass("error")}>{error}</div>}
            {success && <div className={messageClass("success")}>{success}</div>}

            {!isCryptoRail && (
              <button
                className="w-full cursor-pointer rounded-[var(--r-sm)] border-0 bg-[var(--accent)] px-4 py-3 text-sm font-bold tracking-[0.02em] text-[#06170a] transition-[transform,filter] duration-150 hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
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
            )}
          </div>

          {/* Summary sidebar */}
          <div className={`${cardClass} h-fit`}>
            <h3 className="mb-[14px] text-sm font-bold tracking-[-0.01em] text-[var(--t1)]">
              Summary
            </h3>
            {isCryptoRail ? (
              <>
                <div className={summaryRowClass}>
                  <span>Amount</span>
                  <span>${displayAmount.toFixed(2)}</span>
                </div>
                <div className={summaryRowClass}>
                  <span>Hula fee</span>
                  <span>$0.00</span>
                </div>
                <div
                  className={`${summaryRowClass} mt-1.5 border-b-0 border-t border-[var(--b2)] pt-3 text-[15px] font-bold text-[var(--accent)]`}
                >
                  <span>
                    {activeTab === "deposit"
                      ? "USDC transfer"
                      : "Manual withdrawal"}
                  </span>
                  <span>${displayAmount.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <>
                <div className={summaryRowClass}>
                  <span>Amount</span>
                  <span>${displayAmount.toFixed(2)}</span>
                </div>
                <div className={summaryRowClass}>
                  <span>Fee (2%)</span>
                  <span>${fee.toFixed(2)}</span>
                </div>
                <div className={`${summaryRowClass} mt-1.5 border-b-0 border-t border-[var(--b2)] pt-3 text-[15px] font-bold text-[var(--accent)]`}>
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </>
            )}

            {/* Recent transactions */}
            {transactions.length > 0 && (
              <>
                <h4 className="mb-2.5 mt-[22px] text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--t3)]">
                  Recent transactions
                </h4>
                {transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.transactionId}
                    className={`${summaryRowClass} text-xs`}
                  >
                    <span
                      className={
                        tx.type === "deposit"
                          ? "font-semibold text-[var(--yes)]"
                          : "font-semibold text-[var(--no)]"
                      }
                    >
                      {tx.type === "deposit" ? "+" : "−"}${tx.amount.toFixed(2)}
                    </span>
                    <span className="text-[var(--t3)]">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </>
            )}
            {isCryptoRail && <CashierCanaryPanel />}
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
