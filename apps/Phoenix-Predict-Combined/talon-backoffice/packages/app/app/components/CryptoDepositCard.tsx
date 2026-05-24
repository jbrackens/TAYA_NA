"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCryptoConfig,
  getCryptoDepositAddress,
  type CryptoRailConfig,
} from "../lib/api/crypto-client";
import { ApiError } from "../lib/api/client";
import { logger } from "../lib/logger";

type LoadState = "loading" | "coming-soon" | "ready" | "error";

// Deposit UI shell for the custodial BSC USDT rail. Wires to the real
// /api/v1/payments/crypto/* endpoints and is fail-closed: when the rail is not
// configured it shows "coming soon" rather than a fake address.
// VISUAL QA PENDING — typechecked, not yet visually verified. A QR of `address`
// is a flagged follow-up (add qrcode.react) to confirm layout during QA.
export default function CryptoDepositCard() {
  const [state, setState] = useState<LoadState>("loading");
  const [config, setConfig] = useState<CryptoRailConfig | null>(null);
  const [address, setAddress] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const cfg = await getCryptoConfig();
      setConfig(cfg);
      if (!cfg.configured) {
        setState("coming-soon");
        return;
      }
      try {
        const dep = await getCryptoDepositAddress();
        setAddress(dep.address);
        setState("ready");
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 503) {
          setState("coming-soon");
          return;
        }
        throw err;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("CryptoDeposit", "Failed to load crypto deposit", message);
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copyAddress = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn("CryptoDeposit", "Clipboard copy failed", message);
    }
  }, [address]);

  const network = (config?.network ?? "bsc").toUpperCase();
  const asset = config?.asset ?? "USDT";
  const confirmations = config?.confirmations ?? 12;
  const tokenStandard = network === "BSC" ? "BEP-20" : network;

  if (state === "loading") {
    return <div className="cashier-section">Loading crypto deposit…</div>;
  }

  if (state === "error") {
    return (
      <div className="cashier-section">
        <div className="cashier-msg error">
          Could not load crypto deposit. Please try again.
        </div>
        <button className="cashier-quick-btn" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  if (state === "coming-soon") {
    return (
      <div className="cashier-section">
        <div className="cashier-msg pending">
          {asset} deposits on {network} are coming soon.
        </div>
      </div>
    );
  }

  return (
    <div className="cashier-section">
      <label className="cashier-label">
        Your {asset} deposit address ({network})
      </label>
      <div
        style={{
          fontFamily: "monospace",
          wordBreak: "break-all",
          padding: "0.75rem",
          borderRadius: "0.5rem",
          background: "rgba(0,0,0,0.04)",
          marginBottom: "0.5rem",
        }}
      >
        {address}
      </div>
      <button className="cashier-quick-btn" onClick={copyAddress}>
        {copied ? "Copied!" : "Copy address"}
      </button>
      <p className="cashier-balance-sub" style={{ marginTop: "0.75rem" }}>
        Send only{" "}
        <strong>
          {asset} ({tokenStandard})
        </strong>{" "}
        on {network} to this address. Funds appear after {confirmations}{" "}
        confirmations. Sending the wrong token or network will result in loss of
        funds.
      </p>
    </div>
  );
}
