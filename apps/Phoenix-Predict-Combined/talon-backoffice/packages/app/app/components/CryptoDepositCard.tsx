"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCryptoConfig,
  type CryptoRailConfig,
} from "../lib/api/crypto-client";
import { logger } from "../lib/logger";

type LoadState = "loading" | "coming-soon" | "ready" | "error";

// Non-custodial crypto deposits are not live yet. The legacy custodial
// /api/v1/payments/crypto/deposit-address endpoint is intentionally not called
// from this card; production also blocks that rail at gateway startup.
export default function CryptoDepositCard() {
  const [state, setState] = useState<LoadState>("loading");
  const [config, setConfig] = useState<CryptoRailConfig | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const cfg = await getCryptoConfig();
      setConfig(cfg);
      setState(cfg.configured ? "ready" : "coming-soon");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("CryptoDeposit", "Failed to load crypto deposit", message);
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const network = (config?.network ?? "tron").toUpperCase();
  const asset = config?.asset ?? "USDT";

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
          {asset} deposits are moving to the non-custodial cashier and are not
          live yet.
        </div>
      </div>
    );
  }

  return (
    <div className="cashier-section">
      <label className="cashier-label">
        {asset} deposits ({network})
      </label>
      <div className="cashier-msg pending">
        Crypto deposits are being moved to the non-custodial cashier. We will
        show a Tron USDT deposit address here once the new bridge-backed rail is
        live.
      </div>
      <p className="cashier-balance-sub mt-3">
        Do not send funds to any old Hula Na! custodial BSC address. V1 crypto
        deposits must be non-custodial and bridge into your user wallet.
      </p>
    </div>
  );
}
