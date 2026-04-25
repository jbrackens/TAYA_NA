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
  onPreview: _onPreview,
  onSubmit,
}: TradeTicketProps) {
  const [side, setSide] = useState<OrderSide>("yes");
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
        .tt { padding: 20px 18px; border-radius: var(--r-md); }
        .tt-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .tt-title {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--t1);
        }
        .tt-mode {
          display: flex;
          gap: 2px;
          padding: 3px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--r-pill);
        }
        .tt-mode button {
          background: transparent;
          border: none;
          color: var(--t3);
          padding: 5px 12px;
          border-radius: var(--r-pill);
          font-family: inherit;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }
        .tt-mode button.is-active {
          color: var(--t1);
          background: rgba(255, 255, 255, 0.1);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .tt-sides {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 16px;
        }
        .tt-side {
          position: relative;
          border: none;
          border-radius: var(--r-md);
          padding: 16px 14px;
          cursor: pointer;
          font-family: inherit;
          color: var(--t1);
          transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms ease;
          text-align: left;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.11) 0%, rgba(255, 255, 255, 0.04) 100%),
            rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border: 1px solid rgba(255, 255, 255, 0.13);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            inset 0 -1px 0 rgba(255, 255, 255, 0.04),
            inset 1px 0 2px var(--chroma-1),
            inset -1px 0 2px var(--chroma-2),
            0 2px 6px rgba(0, 0, 0, 0.15),
            0 10px 24px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }
        .tt-side::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 55%;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
          pointer-events: none;
          mix-blend-mode: overlay;
        }
        .tt-side::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0;
          transition: opacity 280ms ease;
          background: radial-gradient(ellipse 70% 60% at 50% 100%, var(--tint) 0%, transparent 70%);
        }
        .tt-side.yes { --tint: var(--yes-glow); }
        .tt-side.no  { --tint: var(--no-glow); }
        .tt-side.is-selected::after { opacity: 1; }
        .tt-side.is-selected {
          border-color: rgba(255, 255, 255, 0.26);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            inset 0 -1px 0 rgba(255, 255, 255, 0.06),
            0 0 0 2px var(--tint),
            0 4px 16px rgba(0, 0, 0, 0.25),
            0 0 32px var(--tint);
        }
        .tt-side:hover { transform: translateY(-1px); }
        .tt-side:active { transform: scale(0.97); }
        .tt-side:focus-visible {
          outline: none;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            0 0 0 2px var(--tint),
            0 0 16px var(--tint);
        }

        .tt-side-label {
          position: relative;
          z-index: 1;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--t3);
          margin-bottom: 6px;
          display: block;
          transition: color 200ms ease;
        }
        .tt-side.yes.is-selected .tt-side-label { color: var(--yes); }
        .tt-side.no.is-selected  .tt-side-label { color: var(--no); }
        .tt-side-price {
          position: relative;
          z-index: 1;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 28px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.02em;
          line-height: 1;
          color: var(--t1);
          display: block;
        }
        .tt-side.yes.is-selected .tt-side-price { text-shadow: 0 0 16px var(--yes-glow); }
        .tt-side.no.is-selected  .tt-side-price { text-shadow: 0 0 16px var(--no-glow); }
        .tt-side-sub {
          position: relative;
          z-index: 1;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--t2);
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
          font-size: 10px;
          font-weight: 700;
          color: var(--t3);
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .tt-amt-balance {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--t2);
          font-variant-numeric: tabular-nums;
        }

        .tt-amt-display {
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.015) 100%),
            rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--r-sm);
          padding: 13px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .tt-amt-value {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 28px;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.02em;
          color: var(--t1);
          line-height: 1;
          border: none;
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
          color: var(--t2);
          font-variant-numeric: tabular-nums;
          line-height: 1.4;
        }
        .tt-amt-sub .win { color: var(--accent); font-weight: 600; text-shadow: 0 0 6px var(--accent-glow-color); }

        .tt-chips {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        .tt-chip {
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.03) 100%),
            rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px) saturate(150%);
          -webkit-backdrop-filter: blur(20px) saturate(150%);
          color: var(--t1);
          border: 1px solid rgba(255, 255, 255, 0.11);
          border-radius: var(--r-sm);
          padding: 8px 4px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            0 2px 4px rgba(0, 0, 0, 0.15);
          transition: all 180ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .tt-chip:hover { transform: translateY(-1px); }
        .tt-chip.is-active {
          color: var(--accent);
          background: rgba(43, 228, 128, 0.13);
          border-color: rgba(43, 228, 128, 0.38);
          box-shadow:
            inset 0 1px 0 rgba(43, 228, 128, 0.26),
            0 0 0 1px rgba(43, 228, 128, 0.18),
            0 0 14px rgba(43, 228, 128, 0.22);
          text-shadow: 0 0 6px var(--accent-glow-color);
        }

        .tt-summary {
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-variant-numeric: tabular-nums;
        }
        .tt-summary-row { display: flex; justify-content: space-between; }
        .tt-summary-row .k { color: var(--t3); }
        .tt-summary-row .v { color: var(--t1); }
        .tt-summary-row .v.accent { color: var(--accent); text-shadow: 0 0 6px var(--accent-glow-color); }

        .tt-cta {
          margin-top: 16px;
          width: 100%;
          position: relative;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 50%),
            linear-gradient(115deg, #2be480 0%, #00ffaa 100%);
          color: #04140a;
          border: 1px solid rgba(43, 228, 128, 0.6);
          border-radius: var(--r-md);
          padding: 14px 16px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.5),
            inset 0 -1px 0 rgba(0, 0, 0, 0.15),
            0 3px 10px rgba(43, 228, 128, 0.22),
            0 10px 28px rgba(43, 228, 128, 0.18),
            0 0 42px rgba(43, 228, 128, 0.12);
          transition: all 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }
        .tt-cta::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0;
          height: 50%;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, transparent 100%);
          pointer-events: none;
          border-radius: inherit;
        }
        .tt-cta::after {
          content: '';
          position: absolute; top: -50%; left: -50%;
          width: 200%; height: 200%;
          background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.3) 50%, transparent 60%);
          animation: tt-shimmer 3.2s ease-in-out infinite;
          pointer-events: none;
          border-radius: inherit;
        }
        @keyframes tt-shimmer {
          0%, 100% { transform: translateX(-40%); }
          50% { transform: translateX(20%); }
        }
        .tt-cta:hover { transform: translateY(-2px); }
        .tt-cta:active { transform: scale(0.98); }
        .tt-cta:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          transform: none;
        }
        .tt-cta:disabled::after { animation: none; }

        .tt-error {
          margin-top: 10px;
          font-size: 12px;
          color: var(--no);
          text-align: center;
        }
        .tt-closed {
          margin-top: 12px;
          font-size: 12px;
          color: var(--t3);
          text-align: center;
          padding: 8px;
          border: 1px dashed rgba(255, 255, 255, 0.12);
          border-radius: var(--r-sm);
        }
      `}</style>

      <section className="glass tt" aria-label="Trade ticket">
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
                onClick={() => setAmount(Math.min(a, maxAmount))}
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
