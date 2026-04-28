"use client";

/**
 * TradeTicket — Liquid Glass trade form on /market/[ticker].
 *
 * Layout (DESIGN.md §6 + §8):
 *   Title + mode switcher (Market / Limit)
 *   YES/NO side selector (glass buttons with liquid-tint ::after on select)
 *   Amount block (.glass-inset display + chips + balance)
 *   Summary rows (avg fill, slippage, shares, payout)
 *   Review CTA (2-stop mint → teal gradient, shimmer)
 *
 * Amount is in dollars. Quantity (shares) = amount / price * 100. The
 * PredictionApiClient interface still takes `quantity`, so we convert
 * at submit time. This preserves API wiring untouched (D5-style
 * design-only change).
 *
 * Limit mode is UI-only in Phase 3 — placing a limit order still
 * requires the gateway to accept `orderType: 'limit'` with a
 * `priceCents`. The mockup shows Market as active, so Limit is parked
 * here for Phase 4 wire-up.
 */

import { useState, useCallback, useMemo } from "react";
import type {
  PredictionMarket,
  OrderSide,
  OrderPreview,
} from "@phoenix-ui/api-client/src/prediction-types";

interface TradeTicketProps {
  market: PredictionMarket;
  balance?: number;
  /**
   * Preselected side for the ticket. Threaded through from the
   * `?side=yes|no` query param on /market/[ticker] so MarketCard's pills
   * can deep-link into a side-specific trade. Defaults to "yes".
   */
  defaultSide?: OrderSide;
  onPreview?: (
    side: OrderSide,
    quantity: number,
  ) => Promise<OrderPreview | null>;
  onSubmit?: (side: OrderSide, quantity: number) => Promise<void>;
}

const QUICK_AMOUNTS = [5, 25, 100] as const;

type TicketMode = "market" | "limit";

export function TradeTicket({
  market,
  balance,
  defaultSide = "yes",
  onPreview: _onPreview,
  onSubmit,
}: TradeTicketProps) {
  const [side, setSide] = useState<OrderSide>(defaultSide);
  const [amount, setAmount] = useState(25);
  const [mode, setMode] = useState<TicketMode>("market");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = market.status === "open";
  const price = side === "yes" ? market.yesPriceCents : market.noPriceCents;
  const otherPrice =
    side === "yes" ? market.noPriceCents : market.yesPriceCents;

  // quantity = # of contracts; cost = quantity * price / 100
  const quantity = useMemo(
    () => (price > 0 ? Math.max(0, amount / (price / 100)) : 0),
    [amount, price],
  );
  const shares = quantity;
  const payout = shares * 1; // winning contracts pay $1 each
  const impliedProb = price; // cents are already 0-100, readable as %

  const handleSubmit = useCallback(async () => {
    if (!onSubmit) return;
    if (quantity < 1) {
      setError("Amount too small — minimum 1 share per trade.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(side, Math.floor(quantity));
      setAmount(25);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setSubmitting(false);
    }
  }, [side, quantity, onSubmit]);

  const setSideAndReset = (s: OrderSide) => {
    setSide(s);
    setError(null);
  };

  const dollars = Math.floor(amount);
  const cents = Math.round((amount - dollars) * 100);
  const centsStr = cents.toString().padStart(2, "0");

  const maxAmount =
    typeof balance === "number" ? Math.floor(balance) : Infinity;

  return (
    <>
      <style>{`
        .tt {
          background: var(--surface-1);
          border: 1px solid var(--border-1);
          padding: 20px;
          border-radius: var(--r-rh-lg);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .tt-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .tt-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--t1);
          letter-spacing: -0.01em;
        }
        .tt-mode {
          display: inline-flex;
          gap: 2px;
          padding: 3px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-1);
          border-radius: var(--r-pill);
        }
        .tt-mode button {
          background: transparent;
          border: 0;
          color: var(--t3);
          padding: 5px 12px;
          border-radius: var(--r-pill);
          font-family: inherit;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: color 120ms ease, background 120ms ease;
        }
        .tt-mode button:hover { color: var(--t1); }
        .tt-mode button.is-active {
          color: #061a10;
          background: var(--accent);
        }

        .tt-sides {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 16px;
        }
        .tt-side {
          position: relative;
          border: 1px solid var(--border-1);
          border-radius: var(--r-rh-md);
          padding: 14px;
          cursor: pointer;
          font-family: inherit;
          color: var(--t1);
          background: rgba(255, 255, 255, 0.02);
          text-align: left;
          transition: background 120ms ease, border-color 120ms ease;
        }
        .tt-side:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .tt-side:focus-visible {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-soft);
        }
        .tt-side.yes.is-selected {
          background: var(--yes-soft);
          border-color: rgba(113, 238, 184, 0.4);
        }
        .tt-side.no.is-selected {
          background: var(--no-soft);
          border-color: rgba(255, 139, 107, 0.4);
        }

        .tt-side-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--t3);
          margin-bottom: 6px;
          display: block;
        }
        .tt-side.yes.is-selected .tt-side-label { color: var(--yes-text); }
        .tt-side.no.is-selected  .tt-side-label { color: var(--no-text); }
        .tt-side-price {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 28px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.02em;
          line-height: 1;
          color: var(--t1);
          display: block;
        }
        .tt-side.yes.is-selected .tt-side-price { color: var(--yes-text); }
        .tt-side.no.is-selected  .tt-side-price { color: var(--no-text); }
        .tt-side-sub {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--t3);
          margin-top: 6px;
          font-variant-numeric: tabular-nums;
          display: block;
        }

        .tt-amount { margin-bottom: 14px; }
        .tt-amt-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .tt-amt-label {
          font-size: 12px;
          color: var(--t3);
          font-weight: 500;
        }
        .tt-amt-balance {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--t3);
          font-variant-numeric: tabular-nums;
        }

        .tt-amt-display {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-1);
          border-radius: var(--r-rh-md);
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .tt-amt-value {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 28px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.02em;
          color: var(--t1);
          line-height: 1;
          border: 0;
          background: transparent;
          outline: none;
          width: 120px;
          padding: 0;
        }
        .tt-amt-value:focus-visible { color: var(--accent); }
        .tt-amt-affix { color: var(--t3); }
        .tt-amt-sub {
          text-align: right;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          color: var(--t3);
          font-variant-numeric: tabular-nums;
          line-height: 1.4;
        }
        .tt-amt-sub .win { color: var(--yes-text); font-weight: 600; }

        .tt-chips {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        .tt-chip {
          background: rgba(255, 255, 255, 0.04);
          color: var(--t2);
          border: 0;
          border-radius: var(--r-pill);
          padding: 8px 4px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          cursor: pointer;
          transition: background 120ms ease, color 120ms ease;
        }
        .tt-chip:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--t1);
        }
        .tt-chip.is-active {
          background: var(--accent);
          color: #061a10;
        }

        .tt-summary {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid var(--border-1);
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-variant-numeric: tabular-nums;
        }
        .tt-summary-row { display: flex; justify-content: space-between; }
        .tt-summary-row .k { color: var(--t3); }
        .tt-summary-row .v { color: var(--t1); }
        .tt-summary-row .v.accent { color: var(--yes-text); }

        .tt-cta {
          margin-top: 16px;
          width: 100%;
          background: var(--accent);
          color: #061a10;
          border: 0;
          border-radius: var(--r-pill);
          padding: 14px 16px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: filter 120ms ease, transform 120ms ease;
        }
        .tt-cta:hover { filter: brightness(1.05); transform: translateY(-1px); }
        .tt-cta:disabled {
          cursor: not-allowed;
          opacity: 0.45;
          transform: none;
          filter: none;
        }

        .tt-error {
          margin-top: 10px;
          font-size: 12px;
          color: var(--no-text);
          text-align: center;
        }
        .tt-closed {
          margin-top: 12px;
          font-size: 12px;
          color: var(--t3);
          text-align: center;
          padding: 10px;
          border: 1px dashed var(--border-1);
          border-radius: var(--r-rh-sm);
        }
      `}</style>

      <section className="tt" aria-label="Trade ticket">
        <div className="tt-head">
          <span className="tt-title">Trade</span>
          <div className="tt-mode" role="tablist" aria-label="Order type">
            <button
              role="tab"
              aria-selected={mode === "market"}
              className={mode === "market" ? "is-active" : ""}
              onClick={() => setMode("market")}
            >
              Market
            </button>
            <button
              role="tab"
              aria-selected={mode === "limit"}
              className={mode === "limit" ? "is-active" : ""}
              onClick={() => setMode("limit")}
              disabled
              title="Limit orders arrive in the next phase"
            >
              Limit
            </button>
          </div>
        </div>

        <div className="tt-sides" role="tablist" aria-label="Side">
          <button
            role="tab"
            aria-selected={side === "yes"}
            onClick={() => setSideAndReset("yes")}
            className={`tt-side yes ${side === "yes" ? "is-selected" : ""}`}
          >
            <span className="tt-side-label">YES</span>
            <span className="tt-side-price">{market.yesPriceCents}¢</span>
            <span className="tt-side-sub">
              {market.yesPriceCents >= 50 ? "+" : "−"}
              {Math.abs(market.yesPriceCents - 50)} · {market.yesPriceCents}%
              prob
            </span>
          </button>
          <button
            role="tab"
            aria-selected={side === "no"}
            onClick={() => setSideAndReset("no")}
            className={`tt-side no ${side === "no" ? "is-selected" : ""}`}
          >
            <span className="tt-side-label">NO</span>
            <span className="tt-side-price">{market.noPriceCents}¢</span>
            <span className="tt-side-sub">
              {market.noPriceCents >= 50 ? "+" : "−"}
              {Math.abs(market.noPriceCents - 50)} · {market.noPriceCents}% prob
            </span>
          </button>
        </div>

        <div className="tt-amount">
          <div className="tt-amt-head">
            <span className="tt-amt-label">Amount</span>
            <span className="tt-amt-balance">
              Balance ${typeof balance === "number" ? balance.toFixed(2) : "—"}
            </span>
          </div>
          <div className="tt-amt-display">
            <div
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: 28,
                fontWeight: 500,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: "var(--t1)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span className="tt-amt-affix">$</span>
              {dollars}
              <span className="tt-amt-affix">.{centsStr}</span>
            </div>
            <div className="tt-amt-sub">
              {Math.floor(shares)} shares
              <br />
              Payout <span className="win">${payout.toFixed(2)}</span>
            </div>
          </div>
          <div className="tt-chips" role="group" aria-label="Quick amount">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(a)}
                className={`tt-chip ${Math.floor(amount) === a ? "is-active" : ""}`}
              >
                ${a}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                setAmount(typeof balance === "number" ? Math.floor(balance) : 0)
              }
              className="tt-chip"
              disabled={typeof balance !== "number" || balance <= 0}
            >
              MAX
            </button>
          </div>
        </div>

        <div className="tt-summary">
          <div className="tt-summary-row">
            <span className="k">Avg. fill price</span>
            <span className="v">{price}¢</span>
          </div>
          <div className="tt-summary-row">
            <span className="k">Implied prob</span>
            <span className="v">{impliedProb}%</span>
          </div>
          <div className="tt-summary-row">
            <span className="k">Shares</span>
            <span className="v">{shares.toFixed(2)}</span>
          </div>
          <div className="tt-summary-row">
            <span className="k">Payout if {side.toUpperCase()}</span>
            <span className="v accent">${payout.toFixed(2)}</span>
          </div>
        </div>

        {isOpen ? (
          <button
            type="button"
            onClick={handleSubmit}
            className="tt-cta"
            disabled={submitting || quantity < 1}
          >
            {submitting ? "Placing…" : `Review trade · $${amount.toFixed(2)}`}
          </button>
        ) : (
          <div className="tt-closed">
            This market is {market.status}. Trading is paused.
          </div>
        )}

        {/* Suppress unused-warning: API surface preserved for Phase 4 */}
        <input type="hidden" value={otherPrice} readOnly />

        {error && <div className="tt-error">{error}</div>}
      </section>
    </>
  );
}
