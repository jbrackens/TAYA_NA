"use client";

/**
 * TradeTicket — warm-light trade form on /market/[ticker].
 *
 * Layout (DESIGN.md §6 + §8):
 *   Title + mode switcher (Market / Limit)
 *   YES/NO side selector
 *   Amount block + chips + balance
 *   Summary rows (avg fill, slippage, shares, payout)
 *   Auth-aware CTA
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
import Link from "next/link";
import type {
  PredictionMarket,
  OrderSide,
  OrderAction,
  OrderPreview,
  PlaceOrderResponse,
  TimeInForce,
} from "@phoenix-ui/api-client/src/prediction-types";
import { useToast } from "../ToastProvider";

/**
 * Extra fields the trade ticket can pass to the parent's submit handler
 * when an exchange-mode market enables advanced order types. All optional
 * for backward compatibility — AMM-mode markets ignore them entirely.
 */
export interface TradeTicketSubmitOptions {
  orderType?: "market" | "limit";
  priceCents?: number;
  action?: OrderAction;
  timeInForce?: TimeInForce;
  postOnly?: boolean;
  notionalCapCents?: number;
}

interface TradeTicketProps {
  market: PredictionMarket;
  balance?: number;
  /**
   * Preselected side for the ticket. Threaded through from the
   * `?side=yes|no` query param on /market/[ticker] so MarketCard's pills
   * can deep-link into a side-specific trade. Defaults to "yes".
   */
  defaultSide?: OrderSide;
  defaultAmount?: number;
  isAuthenticated: boolean;
  authLoading: boolean;
  /** Available shares the user can sell from their YES/NO position. */
  availableYesShares?: number;
  availableNoShares?: number;
  onPreview?: (
    side: OrderSide,
    quantity: number,
  ) => Promise<OrderPreview | null>;
  /**
   * Submit handler returns the gateway's PlaceOrderResponse so the ticket
   * can show a truthful toast — what was filled vs. what rested vs. what
   * got rejected. Returning void (the prior contract) meant the toast had
   * to guess from the request, which produced "Bought 7 YES shares" when
   * the actual outcome was status=cancelled, filled_quantity=0 (no
   * matching liquidity for the IOC market order).
   *
   * Returning `void` is still accepted for back-compat with tests/mocks
   * that don't care about the response; the ticket falls back to a
   * neutral "Order accepted" toast in that case.
   */
  onSubmit?: (
    side: OrderSide,
    quantity: number,
    opts?: TradeTicketSubmitOptions,
  ) => Promise<PlaceOrderResponse | void>;
}

const QUICK_AMOUNTS = [5, 25, 100] as const;

type TicketMode = "market" | "limit";

export function TradeTicket({
  market,
  balance,
  defaultSide = "yes",
  defaultAmount = 25,
  isAuthenticated,
  authLoading,
  availableYesShares = 0,
  availableNoShares = 0,
  onPreview: _onPreview,
  onSubmit,
}: TradeTicketProps) {
  const [side, setSide] = useState<OrderSide>(defaultSide);
  const [amount, setAmount] = useState(defaultAmount);
  const [mode, setMode] = useState<TicketMode>("market");
  const [action, setAction] = useState<OrderAction>("buy");
  // Limit-mode price the user wants to bid/offer. Defaults to mid; exchange
  // mode enables editing.
  const [limitPriceCents, setLimitPriceCents] = useState<number>(
    side === "yes" ? market.yesPriceCents : market.noPriceCents,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const isOpen = market.status === "open";
  const isExchange = market.executionMode === "order_book";
  const marketPrice =
    side === "yes" ? market.yesPriceCents : market.noPriceCents;
  // Effective price drives quantity math: limit orders use the user's price
  // (capped to [1, 99] at the API boundary); market orders use the snapshot.
  const price = mode === "limit" && isExchange ? limitPriceCents : marketPrice;
  const otherPrice =
    side === "yes" ? market.noPriceCents : market.yesPriceCents;
  const availableShares =
    side === "yes" ? availableYesShares : availableNoShares;

  // quantity = # of contracts; cost = quantity * price / 100
  const quantity = useMemo(
    () => (price > 0 ? Math.max(0, amount / (price / 100)) : 0),
    [amount, price],
  );
  const shares = quantity;
  const payout = shares * 1; // winning contracts pay $1 each
  const impliedProb = price; // cents are already 0-100, readable as %
  const hasKnownBalance = typeof balance === "number";
  // Cash-side check applies only to buys. Sells require enough position.
  const insufficientFunds =
    action === "buy" && isAuthenticated && hasKnownBalance && amount > balance;
  const insufficientShares =
    action === "sell" &&
    isAuthenticated &&
    Math.floor(quantity) > availableShares;
  const loginReturnPath = `/market/${market.ticker}?side=${side}&amount=${amount.toFixed(2)}`;
  const loginHref = `/auth/login?returnUrl=${encodeURIComponent(loginReturnPath)}`;

  const handleSubmit = useCallback(async () => {
    if (!onSubmit) return;
    if (!isAuthenticated || authLoading || !isOpen) return;
    if (insufficientFunds || insufficientShares) return;
    if (quantity < 1) {
      setError("Amount too small — minimum 1 share per trade.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const qty = Math.floor(quantity);
      let response: PlaceOrderResponse | void;
      if (isExchange) {
        const opts: TradeTicketSubmitOptions = {
          orderType: mode,
          action,
        };
        if (mode === "limit") {
          opts.priceCents = limitPriceCents;
          // Default time-in-force gtc; advanced section can override later.
          opts.timeInForce = "gtc";
        } else if (action === "buy") {
          // Market buy: send a notional cap so the gateway can reject
          // mis-priced fills. Server enforces this is required for ALL
          // market buys — exchange and AMM alike. (QA caught this when
          // AMM-mode markets returned 400 "market buy orders require
          // notionalCapCents > 0".)
          opts.notionalCapCents = Math.ceil(amount * 100);
        }
        response = await onSubmit(side, qty, opts);
      } else {
        // AMM mode: buy-only, market-only. Still needs the notional cap
        // — the gateway-side validator doesn't care about execution_mode,
        // only about orderType+action. Pass opts through so the cap
        // arrives in the request body.
        response = await onSubmit(side, qty, {
          orderType: "market",
          action: "buy",
          notionalCapCents: Math.ceil(amount * 100),
        });
      }
      // Truthful post-trade toast. The old version unconditionally said
      // "Bought N YES shares" based on the requested quantity, which lied
      // when the order didn't actually fill — e.g. an IOC market buy
      // against an empty book lands as status=cancelled, filled=0, yet
      // we used to claim "Bought 7 YES shares." Inspect the response and
      // branch on the terminal order status the gateway returns.
      //
      // Keep the user's chosen amount in either branch so a follow-up
      // click reissues the same size — most users want to repeat the
      // bet, not restart from $25.
      const sideLabel = side.toUpperCase();
      const status = response?.order?.status;
      const filled = response?.order?.filledQuantity ?? 0;
      const failureReason = response?.order?.failureReason;
      if (!response) {
        // Legacy onSubmit returning void (tests/mocks). Don't claim a
        // fill we can't confirm; just acknowledge.
        toast.info(
          "Order submitted",
          `${qty} ${sideLabel} on ${market.ticker}`,
        );
      } else if (filled > 0) {
        // ANYTHING with a non-zero fill counts as a success toast,
        // regardless of the terminal status. IOC market orders that
        // exhaust their feasible liquidity end with status='cancelled'
        // and filled=N>0 (the unfilled remainder is what got
        // cancelled, not the fill). Showing "Order cancelled" for a
        // 21-share fill would lie to the user — they did buy 21
        // shares. Order of clauses matters: check filled first.
        if (filled === qty) {
          // Full fill — clean success toast.
          const verb = action === "sell" ? "Sold" : "Bought";
          toast.success(
            `${verb} ${filled} ${sideLabel} share${filled === 1 ? "" : "s"}`,
            `$${amount.toFixed(2)} on ${market.ticker}`,
          );
        } else {
          // Partial — explain what happened to the remainder. IOC
          // market orders cancel the rest; resting limit orders book it.
          const verb =
            action === "sell" ? "Partially sold" : "Partially filled";
          const remainderFate =
            status === "open"
              ? "resting on the book"
              : status === "partial" && mode === "limit"
                ? "resting on the book"
                : "cancelled (no more liquidity)";
          toast.success(
            `${verb}: ${filled} of ${qty} ${sideLabel}`,
            `Remainder ${qty - filled} ${remainderFate}`,
          );
        }
      } else if (status === "open") {
        // Limit order rested without crossing — most common outcome on a
        // thin book. (filled=0, status=open.)
        const priceLabel =
          mode === "limit" ? `${limitPriceCents}¢` : `${price}¢`;
        toast.info(
          `Order resting on the book`,
          `${qty} ${sideLabel} @ ${priceLabel} — waiting for a match`,
        );
      } else if (status === "cancelled" || status === "rejected") {
        // Zero-fill cancellation/rejection. failureReason is one of the
        // typed sentinels; fall back to a generic message if missing.
        const why = failureReason
          ? failureReason.replace(/_/g, " ")
          : "no matching liquidity";
        toast.error(
          `Order ${status}`,
          `${qty} ${sideLabel} on ${market.ticker} — ${why}`,
        );
      } else {
        // pending/expired/unknown: don't pretend it worked.
        toast.info(
          `Order ${status || "submitted"}`,
          `${qty} ${sideLabel} on ${market.ticker}`,
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setSubmitting(false);
    }
  }, [
    side,
    quantity,
    onSubmit,
    isAuthenticated,
    authLoading,
    insufficientFunds,
    insufficientShares,
    isOpen,
    isExchange,
    mode,
    action,
    limitPriceCents,
    amount,
    market.ticker,
    toast,
  ]);

  const setSideAndReset = (s: OrderSide) => {
    setSide(s);
    setError(null);
  };

  const dollars = Math.floor(amount);
  const cents = Math.round((amount - dollars) * 100);
  const centsStr = cents.toString().padStart(2, "0");

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
        /* AMM markets disable the Limit toggle (no limit-order support).
         * Without these styles the button looked fully clickable, which
         * QA reported as "clicking Limit on AMM appears to do nothing."
         * Now the disabled state is visually unambiguous. */
        .tt-mode button:disabled {
          color: var(--t3);
          opacity: 0.4;
          cursor: not-allowed;
        }
        .tt-mode button:disabled:hover {
          color: var(--t3);
          background: transparent;
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
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
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
        .tt-state-note,
        .tt-trust {
          margin-top: 10px;
          font-size: 12px;
          line-height: 1.45;
          color: var(--t2);
          text-align: center;
        }
        .tt-trust {
          color: var(--t3);
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
              onClick={() => isExchange && setMode("limit")}
              disabled={!isExchange}
              title={
                isExchange
                  ? "Limit order — set your max buy / min sell price"
                  : "Limit orders require an exchange-mode market"
              }
            >
              Limit
            </button>
          </div>
        </div>

        {/* Buy/Sell toggle — only meaningful for exchange markets. AMM stays
            buy-only because the curve only mints; sell support is the
            order-book book's job. */}
        {isExchange && (
          <div
            className="tt-mode"
            role="tablist"
            aria-label="Action"
            style={{ marginBottom: 14, alignSelf: "flex-start" }}
          >
            <button
              role="tab"
              aria-selected={action === "buy"}
              className={action === "buy" ? "is-active" : ""}
              onClick={() => setAction("buy")}
            >
              Buy
            </button>
            <button
              role="tab"
              aria-selected={action === "sell"}
              className={action === "sell" ? "is-active" : ""}
              onClick={() => setAction("sell")}
              disabled={availableShares === 0}
              title={
                availableShares === 0
                  ? "You don't have shares on this side to sell"
                  : `Sell up to ${availableShares} ${side.toUpperCase()} shares`
              }
            >
              Sell
            </button>
          </div>
        )}

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

        {/* Limit price input — appears in exchange + limit mode. Bounded
            [1, 99] cents per the engine's price bounds (out-of-range prices
            are rejected at the API). Step is 1¢ to match tick size. */}
        {isExchange && mode === "limit" && (
          <div
            className="tt-amount"
            style={{ marginBottom: 14 }}
            aria-label="Limit price"
          >
            <div className="tt-amt-head">
              <span className="tt-amt-label">
                Limit price ({side.toUpperCase()})
              </span>
              <span className="tt-amt-balance">Mid {marketPrice}¢</span>
            </div>
            <input
              type="number"
              min={1}
              max={99}
              step={1}
              value={limitPriceCents}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isFinite(v)) {
                  setLimitPriceCents(Math.max(1, Math.min(99, v)));
                }
              }}
              style={{
                width: "100%",
                background: "var(--surface-2)",
                border: "1px solid var(--border-1)",
                color: "var(--t1)",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 22,
                fontVariantNumeric: "tabular-nums",
                padding: "10px 12px",
                borderRadius: "var(--r-rh-md)",
                outline: "none",
              }}
            />
            <p
              style={{
                fontSize: 11,
                color: "var(--t3)",
                marginTop: 6,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {action === "buy"
                ? `Pays up to ${limitPriceCents}¢/share. Rest unfilled at limit.`
                : `Sells at ${limitPriceCents}¢/share or better.`}
            </p>
          </div>
        )}

        <div className="tt-amount">
          <div className="tt-amt-head">
            <span className="tt-amt-label">
              {action === "sell" ? "Shares to sell" : "Amount"}
            </span>
            <span className="tt-amt-balance">
              {action === "sell"
                ? `Available ${availableShares}`
                : `Balance $${typeof balance === "number" ? balance.toFixed(2) : "—"}`}
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
            {QUICK_AMOUNTS.map((a) => {
              const isActive = Math.floor(amount) === a;
              return (
                <button
                  key={a}
                  type="button"
                  // No-op when the chip is already active. Without this guard
                  // every click on the active chip still calls setAmount with
                  // the same value, which React treats as an update and
                  // triggers a re-render of the ticket. Cheap individually,
                  // but combined with a parent that prefetches a returnUrl
                  // bound to amount it can feel like the page hangs in dev
                  // mode while chunks recompile. Cheap defensive change.
                  onClick={() => {
                    if (!isActive) setAmount(a);
                  }}
                  aria-pressed={isActive}
                  className={`tt-chip ${isActive ? "is-active" : ""}`}
                >
                  ${a}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                if (typeof balance !== "number" || balance <= 0) return;
                const next = Math.floor(balance);
                if (Math.floor(amount) !== next) setAmount(next);
              }}
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
          authLoading ? (
            <button type="button" className="tt-cta" disabled>
              Checking session…
            </button>
          ) : !isAuthenticated ? (
            <>
              <Link href={loginHref} className="tt-cta">
                Log in to trade
              </Link>
              <p className="tt-state-note">
                Prices are public. Sign in to place this {side.toUpperCase()}{" "}
                order.
              </p>
            </>
          ) : insufficientFunds ? (
            <>
              <Link href="/cashier" className="tt-cta">
                Add funds
              </Link>
              <p className="tt-state-note" role="alert">
                Your available balance is below this ${amount.toFixed(2)} order.
              </p>
            </>
          ) : insufficientShares ? (
            <>
              <button type="button" className="tt-cta" disabled>
                Not enough shares
              </button>
              <p className="tt-state-note" role="alert">
                You have {availableShares} {side.toUpperCase()} shares
                available; this sell is for {Math.floor(quantity)}.
              </p>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="tt-cta"
              disabled={submitting || quantity < 1}
            >
              {/*
                Label says "Place trade", not "Review trade", because
                clicking this button submits the order immediately. The
                quote panel above already shows fill price, shares, and
                payout — that IS the review surface. A "Review" label
                would imply a confirm modal that does not exist and was
                a stage gotcha during the 2026-05-03 demo dry-run.
              */}
              {submitting
                ? "Placing…"
                : `${action === "sell" ? "Sell" : "Place trade"} · $${amount.toFixed(2)}`}
            </button>
          )
        ) : (
          <div className="tt-closed">
            This market is {market.status}. Trading is paused.
          </div>
        )}

        {isOpen && (
          <p className="tt-trust">
            {price}¢ means a {impliedProb}% implied probability. Winning
            contracts pay $1 each.
          </p>
        )}

        {/* Suppress unused-warning: API surface preserved for Phase 4 */}
        <input type="hidden" value={otherPrice} readOnly />

        {error && <div className="tt-error">{error}</div>}
      </section>
    </>
  );
}
