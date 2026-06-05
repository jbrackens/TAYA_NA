"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  centsToDollars,
  createDepositIntent,
  createWithdrawalRequest,
  dollarsToCents,
  getAlphaCashierConfig,
  listDepositIntents,
  listWalletConnections,
  listWithdrawalRequests,
  requestMetaMaskAccount,
  sendUSDCTransfer,
  signWalletChallenge,
  submitDepositTx,
  type AlphaCashierConfig,
  type DepositIntent,
  type WalletConnection,
  type WithdrawalRequest,
} from "../lib/api/alpha-cashier-client";
import { logger } from "../lib/logger";

type Mode = "deposit" | "withdrawal";
type LoadState = "loading" | "ready" | "error";
type BusyState = "idle" | "connecting" | "creating" | "wallet" | "submitting";

export default function CryptoDepositCard({
  mode,
  amount,
  onBalanceChanged,
}: {
  readonly mode: Mode;
  readonly amount: number;
  readonly onBalanceChanged: () => Promise<void> | void;
}) {
  const [state, setState] = useState<LoadState>("loading");
  const [busy, setBusy] = useState<BusyState>("idle");
  const [config, setConfig] = useState<AlphaCashierConfig | null>(null);
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [destination, setDestination] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deposits, setDeposits] = useState<DepositIntent[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  const amountCents = useMemo(() => dollarsToCents(amount), [amount]);

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const [cfg, wallets, depositItems, withdrawalItems] = await Promise.all([
        getAlphaCashierConfig(),
        listWalletConnections().catch(() => []),
        listDepositIntents().catch(() => []),
        listWithdrawalRequests().catch(() => []),
      ]);
      setConfig(cfg);
      const firstWallet = wallets[0] ?? null;
      setWallet(firstWallet);
      setDestination((current) => current || firstWallet?.walletAddress || "");
      setDeposits(depositItems);
      setWithdrawals(withdrawalItems);
      setState("ready");
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      logger.error("AlphaCashier", "Failed to load cashier config", text);
      setError(text);
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const connect = useCallback(async () => {
    setBusy("connecting");
    setError("");
    setMessage("");
    try {
      const account = await requestMetaMaskAccount();
      const connected = await signWalletChallenge(account);
      setWallet(connected);
      setDestination((current) => current || connected.walletAddress);
      setMessage(`Connected ${shortAddress(connected.walletAddress)}`);
      await load();
      return connected;
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      setError(text);
      throw err;
    } finally {
      setBusy("idle");
    }
  }, [load]);

  const ensureWallet = useCallback(async () => {
    if (wallet) return wallet;
    return connect();
  }, [connect, wallet]);

  const startDeposit = useCallback(async () => {
    if (!config?.enabled) return;
    if (amountCents <= 0) {
      setError("Enter an amount before starting a USDC deposit.");
      return;
    }
    setBusy("creating");
    setError("");
    setMessage("");
    try {
      const connected = await ensureWallet();
      const intent = await createDepositIntent(
        connected.walletAddress,
        amountCents,
      );
      setDeposits((items) => [intent, ...items]);
      setBusy("wallet");
      setMessage("Confirm the USDC transfer in MetaMask.");
      const txHash = await sendUSDCTransfer(intent);
      setBusy("submitting");
      setMessage("Verifying transaction with Tiangge.");
      const credited = await submitDepositTx(intent.id, txHash);
      if (credited?.status === "credited") {
        setDeposits((items) =>
          [credited, ...items.filter((item) => item.id !== credited.id)].slice(
            0,
            5,
          ),
        );
        setMessage(
          `${formatMoney(credited.amountCents)} ${credited.tokenSymbol} credited.`,
        );
        await onBalanceChanged();
      } else {
        setMessage(
          "Transfer submitted. Tiangge will credit once the transaction has enough confirmations.",
        );
        await load();
      }
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      logger.error("AlphaCashier", "USDC deposit failed", text);
      setError(text);
    } finally {
      setBusy("idle");
    }
  }, [amountCents, config?.enabled, ensureWallet, load, onBalanceChanged]);

  const requestWithdrawal = useCallback(async () => {
    if (!config?.enabled || !config.withdrawalsEnabled) return;
    if (amountCents <= 0) {
      setError("Enter an amount before requesting a withdrawal.");
      return;
    }
    setBusy("creating");
    setError("");
    setMessage("");
    try {
      await ensureWallet();
      const request = await createWithdrawalRequest(destination, amountCents);
      setWithdrawals((items) => [request, ...items].slice(0, 5));
      setMessage(
        `${formatMoney(request.amountCents)} ${request.tokenSymbol} withdrawal requested. Funds are reserved pending operator review.`,
      );
      await onBalanceChanged();
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      logger.error("AlphaCashier", "USDC withdrawal request failed", text);
      setError(text);
    } finally {
      setBusy("idle");
    }
  }, [
    amountCents,
    config?.enabled,
    config?.withdrawalsEnabled,
    destination,
    ensureWallet,
    onBalanceChanged,
  ]);

  if (state === "loading") {
    return <div className="cashier-section">Loading USDC cashier...</div>;
  }

  if (state === "error") {
    return (
      <div className="cashier-section">
        <div className="cashier-msg error">
          {error || "Could not load USDC cashier."}
        </div>
        <button className="cashier-quick-btn" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  if (!config?.enabled) {
    return (
      <div className="cashier-section">
        <div className="cashier-msg pending">
          USDC cashier is disabled for this environment.
        </div>
      </div>
    );
  }

  const history = mode === "deposit" ? deposits : withdrawals;
  const actionDisabled =
    busy !== "idle" ||
    amountCents <= 0 ||
    (mode === "withdrawal" &&
      (!config.withdrawalsEnabled || destination.trim() === ""));

  return (
    <div className="cashier-section">
      <label className="cashier-label">
        {config.tokenSymbol} on {config.chainName}
      </label>

      <div className="cashier-status-panel">
        <div className="cashier-status-head">
          <span className="cashier-balance-sub">
            {wallet
              ? shortAddress(wallet.walletAddress)
              : "No wallet connected"}
          </span>
          <span className="cashier-status-pill">
            {config.withdrawalReviewRequired ? "manual review" : "alpha"}
          </span>
        </div>
        <div className="cashier-timeline">
          <StepRow active done={!!wallet} label="Connect MetaMask" />
          <StepRow
            active={!!wallet}
            done={false}
            label={
              mode === "deposit"
                ? "Send exact USDC amount"
                : "Request reviewed withdrawal"
            }
          />
          <StepRow
            active={false}
            done={false}
            label={
              mode === "deposit"
                ? `${config.confirmations} confirmations before credit`
                : "Operator broadcasts after approval"
            }
          />
        </div>
      </div>

      {mode === "withdrawal" && (
        <div className="cashier-section">
          <label className="cashier-label">Destination address</label>
          <input
            className="w-full rounded-[var(--r-sm)] border border-[var(--b1)] bg-[var(--s2)] px-[14px] py-[11px] font-mono text-sm text-[var(--t1)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--t4)] focus:border-[var(--accent)] focus:shadow-[0_0_0_2px_var(--accent-soft)]"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="0x..."
          />
        </div>
      )}

      {message && <div className="cashier-msg success">{message}</div>}
      {error && <div className="cashier-msg error">{error}</div>}
      {mode === "withdrawal" && !config.withdrawalsEnabled && (
        <div className="cashier-msg pending">
          USDC withdrawal requests are disabled until operators turn on the
          alpha withdrawal queue.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          className="cashier-quick-btn"
          onClick={connect}
          disabled={busy !== "idle"}
        >
          {wallet ? "Reconnect" : "Connect"}
        </button>
        <button
          className="cashier-quick-btn min-w-[180px]"
          onClick={mode === "deposit" ? startDeposit : requestWithdrawal}
          disabled={actionDisabled}
        >
          {busy === "idle"
            ? mode === "deposit"
              ? `Deposit ${formatMoney(amountCents)}`
              : `Request ${formatMoney(amountCents)}`
            : busyLabel(busy)}
        </button>
      </div>

      {history.length > 0 && (
        <div className="cashier-canary-panel">
          <div className="cashier-canary-head">
            <span className="cashier-label">
              Recent {mode === "deposit" ? "deposits" : "withdrawals"}
            </span>
          </div>
          {history.slice(0, 4).map((item) => (
            <div className="cashier-canary-row" key={item.id}>
              <span className="cashier-canary-dot ok" />
              <div>
                <div className="cashier-canary-name">
                  {formatMoney(item.amountCents)} {item.tokenSymbol} ·{" "}
                  {item.status}
                </div>
                <div className="cashier-canary-detail">
                  {mode === "deposit"
                    ? shortAddress((item as DepositIntent).txHash || item.id)
                    : shortAddress(
                        (item as WithdrawalRequest).destinationAddress,
                      )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepRow({
  active,
  done,
  label,
}: {
  readonly active: boolean;
  readonly done: boolean;
  readonly label: string;
}) {
  return (
    <div
      className={`cashier-timeline-row ${done ? "done" : active ? "active" : ""}`}
    >
      <span className="cashier-timeline-dot" />
      <div className="cashier-timeline-label">{label}</div>
    </div>
  );
}

function shortAddress(value: string) {
  if (!value || value.length <= 14) return value || "-";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatMoney(cents: number) {
  return `$${centsToDollars(cents).toFixed(2)}`;
}

function busyLabel(busy: BusyState) {
  switch (busy) {
    case "connecting":
      return "Connecting...";
    case "creating":
      return "Creating...";
    case "wallet":
      return "Confirm in wallet...";
    case "submitting":
      return "Verifying...";
    default:
      return "Working...";
  }
}
