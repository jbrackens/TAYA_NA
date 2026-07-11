"use client";

/**
 * TradeTicket — the trade form on /market/[ticker]
 * (P9.2, 2026-07-07 — Robinhood-structure pass).
 *
 * Layout (DESIGN.md §6 + §8):
 *   Title + mode switcher (Market / Limit)
 *   Buy Yes / Buy No underline tabs (side-colored)
 *   Sparse label/value rows: Points (editable) · [Limit price] ·
 *     Price · Est. cost · Payout if <side> is correct
 *   Auth-aware CTA + trust copy
 *
 * Amount is in gameplay points. Quantity (shares) = amount / price * 100. The
 * PredictionApiClient interface still takes `quantity`, so we convert
 * at submit time. This preserves API wiring untouched (D5-style
 * design-only change).
 *
 * Legacy AMM markets are quote-only: the detail page can show preview-backed
 * curve impact, but the ticket must not submit orders against the retired AMM
 * execution path.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import type {
  PredictionMarket,
  OrderSide,
  OrderAction,
  OrderPreview,
  PlaceOrderResponse,
  TimeInForce,
} from "@taptrade-ui/api-client/src/prediction-types";
import { useToast } from "../ToastProvider";
import { complianceDenialKind } from "../../lib/compliance-denial";

/**
 * Extra fields the trade ticket can pass to the parent's submit handler
 * when an exchange-mode market enables advanced order types.
 */
export interface TradeTicketSubmitOptions {
  orderType?: "market" | "limit";
  pricePoints?: number;
  action?: OrderAction;
  timeInForce?: TimeInForce;
  postOnly?: boolean;
  notionalCapPoints?: number;
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
    opts?: TradeTicketSubmitOptions,
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
  onSideChange?: (side: OrderSide) => void;
}

type TicketMode = "market" | "limit";

const TICKET_CARD_CLASS =
  "rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-5 font-['Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif]";
const TICKET_HEAD_CLASS = "mb-3 flex items-center justify-between";
const TICKET_TITLE_CLASS =
  "text-sm font-semibold tracking-[-0.01em] text-[var(--t1)]";
const TICKET_MODE_CLASS =
  "inline-flex gap-0.5 rounded-md border border-[var(--border-1)] bg-[var(--surface-2)] p-[3px]";
const TICKET_MODE_BUTTON_BASE_CLASS =
  "cursor-pointer rounded-md border-0 px-3 py-[5px] [font-family:inherit] text-[11px] font-semibold transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-40 disabled:text-[var(--t3)] disabled:hover:bg-transparent disabled:hover:text-[var(--t3)]";
// P9.2: sides are Robinhood-style underline tabs, not price boxes — the
// price belongs to the summary rows below.
const TICKET_SIDES_CLASS =
  "relative mb-4 grid grid-cols-2 border-b border-[var(--border-1)]";
// P10: focus ring restored (the old focus-visible:outline-none left
// keyboard focus invisible on the primary trading control — WCAG 2.4.7).
const TICKET_SIDE_TAB_BASE_CLASS =
  "cursor-pointer border-0 bg-transparent px-1 pb-2.5 pt-1 [font-family:inherit] text-sm font-semibold transition-colors duration-[120ms] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--focus-ring)] rounded-sm";
// The tap-dot signature, applied to navigation: one indicator slides
// between the two sides (180ms) instead of two static underlines.
const TICKET_SIDE_INDICATOR_CLASS =
  "pointer-events-none absolute bottom-[-1px] left-0 h-[2px] w-1/2 transition-[translate,background-color] duration-[180ms] ease-out";
const TICKET_ROWS_CLASS =
  "flex flex-col gap-3 text-[13px] [font-variant-numeric:tabular-nums]";
const TICKET_ROW_CLASS = "flex items-center justify-between gap-3";
const TICKET_ROW_LABEL_CLASS = "text-[var(--t3)] font-medium";
const TICKET_ROW_VALUE_CLASS =
  "font-['IBM_Plex_Mono',_monospace] font-semibold text-[var(--t1)]";
const TICKET_ROW_SUB_CLASS =
  "mt-0.5 text-right font-['IBM_Plex_Mono',_monospace] text-[11px] font-normal text-[var(--t4)]";
const TICKET_INPUT_CLASS =
  "w-[128px] rounded-md border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2 text-right font-['IBM_Plex_Mono',_monospace] text-[14px] font-semibold text-[var(--t1)] outline-none transition-colors duration-[120ms] [font-variant-numeric:tabular-nums] focus:border-[var(--accent-lo)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
// P10 ink action (Signal Ink signature #2): the commit button is ink,
// not mint — unmistakably an action, never a side. Non-color state
// grammar: hover deepens + lifts; disabled drops opacity AND its label
// states the reason (existing pattern); focus uses the system ring.
const TICKET_CTA_CLASS =
  "relative mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-0 bg-[var(--action)] px-4 py-[14px] [font-family:inherit] text-[15px] font-semibold text-[var(--action-fg)] no-underline transition-[background-color,transform] duration-[120ms] [&:not(:disabled):hover]:-translate-y-px [&:not(:disabled):hover]:bg-[var(--action-hover)] disabled:cursor-not-allowed disabled:opacity-[0.45] disabled:transform-none";
const TICKET_NOTE_CLASS =
  "mt-2.5 text-center text-xs leading-[1.45] text-[var(--t2)]";
const TICKET_TRUST_CLASS =
  "mt-2.5 text-center text-xs leading-[1.45] text-[var(--t3)]";
const TICKET_ERROR_CLASS = "mt-2.5 text-center text-xs text-[var(--no-text)]";
const TICKET_COMPLIANCE_CLASS =
  "mt-3 rounded-[var(--r-rh-sm)] border border-[rgba(255,155,107,0.3)] bg-[rgba(255,155,107,0.1)] p-2.5 text-center text-xs leading-[1.45] text-[var(--no-text)]";
const TICKET_CLOSED_CLASS =
  "mt-3 rounded-[var(--r-rh-sm)] border border-dashed border-[var(--border-1)] p-2.5 text-center text-xs text-[var(--t3)]";

function ticketModeButtonClass(active: boolean): string {
  return `${TICKET_MODE_BUTTON_BASE_CLASS} ${
    active
      ? "bg-[var(--surface-1)] text-[var(--t1)] shadow-[0_1px_2px_rgba(13,17,20,0.06)]"
      : "bg-transparent text-[var(--t3)] hover:text-[var(--t1)]"
  }`;
}

function ticketSideTabClass(side: OrderSide, selected: boolean): string {
  if (!selected) {
    return `${TICKET_SIDE_TAB_BASE_CLASS} text-[var(--t3)] hover:text-[var(--t1)]`;
  }
  return side === "yes"
    ? `${TICKET_SIDE_TAB_BASE_CLASS} text-[var(--yes-text)]`
    : `${TICKET_SIDE_TAB_BASE_CLASS} text-[var(--no-text)]`;
}

// Points are whole cent-equivalent units (1 Point = 1c of play value) —
// never fractional in display.
function formatPointAmount(points: number): string {
  return `${Math.round(points).toLocaleString()} pts`;
}

/**
 * Replacement body for non-open markets (settled, halted, closed, voided).
 * Previously the full ticket rendered with a pre-filled amount and a
 * "buy 38 shares" projection on SETTLED markets, while a
 * "Trading is paused" banner sat at the bottom — investors read the
 * projection as a tradeable quote. The dedicated body shows only the
 * outcome and a one-line explanation.
 */
function renderSettledTicket(
  market: PredictionMarket,
  t: (key: string, values?: Record<string, unknown>) => string,
) {
  const isSettled = market.status === "settled";
  const outcomeLabel = isSettled
    ? market.result === "yes"
      ? t("SETTLED_YES_WINS")
      : market.result === "no"
        ? t("SETTLED_NO_WINS")
        : t("SETTLED")
    : t("MARKET_STATUS", { status: market.status });
  const explainer = isSettled
    ? market.result
      ? t("MARKET_RESOLVED_EXPLAINER", {
          result: market.result.toUpperCase(),
        })
      : t("MARKET_SETTLED_CLOSED")
    : t("MARKET_PAUSED_EXPLAINER", { status: market.status });
  return (
    <>
      <div className={TICKET_HEAD_CLASS}>
        <span className={TICKET_TITLE_CLASS}>{outcomeLabel}</span>
      </div>
      <div className={TICKET_CLOSED_CLASS}>{explainer}</div>
    </>
  );
}

export function TradeTicket({
  market,
  balance,
  defaultSide = "yes",
  defaultAmount = 100,
  isAuthenticated,
  authLoading,
  availableYesShares = 0,
  availableNoShares = 0,
  onPreview,
  onSubmit,
  onSideChange,
}: TradeTicketProps) {
  const { t } = useTranslation("prediction");
  const [side, setSide] = useState<OrderSide>(defaultSide);
  const [amount, setAmount] = useState(defaultAmount);
  const [mode, setMode] = useState<TicketMode>("market");
  const [action, setAction] = useState<OrderAction>("buy");
  // Limit-mode price the user wants to bid/offer. Defaults to mid; exchange
  // mode enables editing.
  const [limitPricePoints, setLimitPricePoints] = useState<number>(
    side === "yes" ? market.yesPricePoints : market.noPricePoints,
  );
  const [preview, setPreview] = useState<OrderPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Live-price-change guard (P10): when the quote moves ≥1¢ under the
  // user's cursor, the CTA pauses for 800ms and the Price row states the
  // move in text — the order is then placed deliberately, not raced.
  const [priceMoved, setPriceMoved] = useState<{
    from: number;
    to: number;
  } | null>(null);
  const [priceGuard, setPriceGuard] = useState(false);
  // Post-submit tap-dot confirmation (the system's kinetic signature;
  // collapses to an instant state change under prefers-reduced-motion).
  const [confirmed, setConfirmed] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setSide(defaultSide);
    onSideChange?.(defaultSide);
  }, [defaultSide, onSideChange]);

  const isOpen = market.status === "open";
  const isExchange = market.executionMode === "order_book";
  const isAmmQuoteOnly = market.executionMode === "amm";
  const marketPrice =
    side === "yes" ? market.yesPricePoints : market.noPricePoints;

  // Detect live quote movement (WebSocket price updates flow in through
  // the `market` prop). Side switches reset the baseline silently.
  const prevPriceRef = useRef(marketPrice);
  const prevSideRef = useRef(side);
  useEffect(() => {
    const prev = prevPriceRef.current;
    const sideChanged = prevSideRef.current !== side;
    prevPriceRef.current = marketPrice;
    prevSideRef.current = side;
    if (sideChanged || !isOpen || prev === marketPrice) return;
    setPriceMoved({ from: prev, to: marketPrice });
    setPriceGuard(true);
    const guard = setTimeout(() => setPriceGuard(false), 800);
    const notice = setTimeout(() => setPriceMoved(null), 4000);
    return () => {
      clearTimeout(guard);
      clearTimeout(notice);
    };
  }, [marketPrice, side, isOpen]);
  // Effective price drives quantity math: limit orders use the user's price
  // (capped to [1, 99] at the API boundary); market orders use the snapshot.
  const price = mode === "limit" && isExchange ? limitPricePoints : marketPrice;
  const otherPrice =
    side === "yes" ? market.noPricePoints : market.yesPricePoints;
  const availableShares =
    side === "yes" ? availableYesShares : availableNoShares;

  // Points unit-model (2026-07-07): a contract priced at 8c costs 8 Points.
  // quantity = whole contracts affordable; cost = quantity * price Points.
  const quantity = useMemo(
    () => (price > 0 ? Math.max(0, Math.floor(amount / price)) : 0),
    [amount, price],
  );
  const requestedQuantity = Math.floor(quantity);

  useEffect(() => {
    if (!onPreview || !isOpen || requestedQuantity < 1) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    let cancelled = false;
    const opts: TradeTicketSubmitOptions = {
      orderType: mode,
      action,
    };
    if (isExchange && mode === "limit") {
      opts.pricePoints = limitPricePoints;
      opts.timeInForce = "gtc";
    } else if (action === "buy") {
      opts.notionalCapPoints = Math.ceil(amount);
    }
    setPreviewLoading(true);
    onPreview(side, requestedQuantity, opts)
      .then((quote) => {
        if (!cancelled) setPreview(quote);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    action,
    amount,
    isExchange,
    isOpen,
    limitPricePoints,
    mode,
    onPreview,
    requestedQuantity,
    side,
  ]);

  const previewFilledQuantity = preview?.filledQuantity;
  const shares =
    typeof previewFilledQuantity === "number" && action === "buy"
      ? previewFilledQuantity
      : quantity;
  const pointsIfCorrect = shares * 100; // Correct contracts settle at 100 Points each.
  const summaryPrice =
    preview?.averageFillPricePoints || preview?.pricePoints || price;
  const impliedProb = summaryPrice; // cents are already 0-100, readable as %
  const effectiveSpend =
    action === "buy" &&
    mode === "market" &&
    typeof preview?.totalCostWithFeesPoints === "number"
      ? preview.totalCostWithFeesPoints
      : quantity * price;
  // Explicit disclosure rows (P10): the preview API already returns
  // feePoints and maxLossPoints — render them instead of folding fees
  // silently into Est. cost. Before a preview resolves, fees derive from
  // the market's posted fee rate; zero renders as an explicit "0 pts"
  // (an absent fee line reads as fee opacity, the category's worst
  // trust pattern per the 2026-07-12 competitor audit).
  const feePoints =
    action === "buy"
      ? (preview?.feePoints ??
        Math.ceil((quantity * price * (market.feeRateBps ?? 0)) / 10_000))
      : null;
  const maxLossPoints =
    action === "buy" ? (preview?.maxLossPoints ?? effectiveSpend) : null;
  // Humanized settlement source for the money-moment one-liner
  // ("Resolves by FIFA official results"). Machine keys stay quiet.
  const settlementSource = (market.settlementSourceKey || "")
    .replace(/^(feed|source|manual):/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  const hasKnownBalance = typeof balance === "number";
  // Point-balance check applies only to buys. Sells require enough position.
  const insufficientFunds =
    action === "buy" &&
    isAuthenticated &&
    hasKnownBalance &&
    effectiveSpend > balance;
  const insufficientShares =
    action === "sell" &&
    isAuthenticated &&
    Math.floor(quantity) > availableShares;
  const marketBuyHasNoLiquidity =
    isExchange &&
    mode === "market" &&
    action === "buy" &&
    preview?.quoteStatus === "cancelled" &&
    preview.filledQuantity === 0;
  const loginReturnPath = `/market/${market.ticker}?side=${side}&amount=${Math.round(amount)}`;
  const loginHref = `/auth/login?returnUrl=${encodeURIComponent(loginReturnPath)}`;

  const handleSubmit = useCallback(async () => {
    if (!onSubmit) return;
    if (!isAuthenticated || authLoading || !isOpen || isAmmQuoteOnly) return;
    if (insufficientFunds || insufficientShares || marketBuyHasNoLiquidity)
      return;
    if (quantity < 1) {
      setError(t("AMOUNT_TOO_SMALL"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const qty = Math.floor(quantity);
      let response: PlaceOrderResponse | void;
      const opts: TradeTicketSubmitOptions = {
        orderType: mode,
        action,
      };
      if (mode === "limit") {
        opts.pricePoints = limitPricePoints;
        // Default time-in-force gtc; advanced section can override later.
        opts.timeInForce = "gtc";
      } else if (action === "buy") {
        opts.notionalCapPoints = Math.ceil(amount);
      }
      response = await onSubmit(side, qty, opts);
      // Truthful post-trade toast. The old version unconditionally said
      // "Bought N YES shares" based on the requested quantity, which lied
      // when the order didn't actually fill — e.g. an IOC market buy
      // against an empty book lands as status=cancelled, filled=0, yet
      // we used to claim "Bought 7 YES shares." Inspect the response and
      // branch on the terminal order status the gateway returns.
      //
      // Keep the user's chosen amount in either branch so a follow-up
      // click reissues the same size — most users want to repeat the
      // prediction order, not restart from the default point amount.
      const sideLabel = side.toUpperCase();
      const status = response?.order?.status;
      const filled = response?.order?.filledQuantity ?? 0;
      const failureReason = response?.order?.failureReason;
      if (!response) {
        // Legacy onSubmit returning void (tests/mocks). Don't claim a
        // fill we can't confirm; just acknowledge.
        toast.info(
          t("ORDER_SUBMITTED"),
          t("ORDER_SUBMITTED_BODY", {
            quantity: qty,
            side: sideLabel,
            ticker: market.ticker,
          }),
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
          toast.success(
            t(action === "sell" ? "SOLD_SHARES" : "BOUGHT_SHARES", {
              quantity: filled,
              side: sideLabel,
              plural: filled === 1 ? "" : "s",
            }),
            t("ORDER_AMOUNT_ON_MARKET", {
              amount: formatPointAmount(amount),
              ticker: market.ticker,
            }),
          );
        } else {
          // Partial — explain what happened to the remainder. IOC
          // market orders cancel the rest; resting limit orders book it.
          const verb =
            action === "sell" ? t("PARTIALLY_SOLD") : t("PARTIALLY_FILLED");
          const remainderFate =
            status === "open"
              ? t("RESTING_ON_BOOK")
              : status === "partial" && mode === "limit"
                ? t("RESTING_ON_BOOK")
                : t("CANCELLED_NO_LIQUIDITY");
          toast.success(
            t("PARTIAL_FILL_SUMMARY", {
              verb,
              filled,
              quantity: qty,
              side: sideLabel,
            }),
            t("REMAINDER_STATUS", {
              remainder: qty - filled,
              status: remainderFate,
            }),
          );
        }
      } else if (status === "open") {
        // Limit order rested without crossing — most common outcome on a
        // thin book. (filled=0, status=open.)
        const priceLabel =
          mode === "limit" ? `${limitPricePoints}¢` : `${price}¢`;
        toast.info(
          t("ORDER_RESTING"),
          t("ORDER_RESTING_BODY", {
            quantity: qty,
            side: sideLabel,
            price: priceLabel,
          }),
        );
      } else if (status === "cancelled" || status === "rejected") {
        // Zero-fill cancellation/rejection. failureReason is one of the
        // typed sentinels; fall back to a generic message if missing.
        const why = failureReason
          ? failureReason.replace(/_/g, " ")
          : "no matching liquidity";
        toast.error(
          t("ORDER_STATUS", { status }),
          t("ORDER_STATUS_BODY", {
            quantity: qty,
            side: sideLabel,
            ticker: market.ticker,
            reason: why,
          }),
        );
      } else {
        // pending/expired/unknown: don't pretend it worked.
        toast.info(
          t("ORDER_STATUS", { status: status || t("SUBMITTED") }),
          t("ORDER_SUBMITTED_BODY", {
            quantity: qty,
            side: sideLabel,
            ticker: market.ticker,
          }),
        );
      }
      // Tap-dot confirm — only for outcomes that actually did something
      // (a fill or a resting order), never for rejections.
      if (!response || filled > 0 || status === "open") {
        setConfirmed(true);
        setTimeout(() => setConfirmed(false), 700);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("ORDER_FAILED"));
    } finally {
      setSubmitting(false);
    }
  }, [
    side,
    quantity,
    onSubmit,
    isAuthenticated,
    authLoading,
    isAmmQuoteOnly,
    insufficientFunds,
    insufficientShares,
    marketBuyHasNoLiquidity,
    isOpen,
    isExchange,
    mode,
    action,
    limitPricePoints,
    amount,
    market.ticker,
    toast,
    t,
  ]);

  const setSideAndReset = (s: OrderSide) => {
    setSide(s);
    onSideChange?.(s);
    setError(null);
  };

  return (
    <section className={TICKET_CARD_CLASS} aria-label={t("TRADE_TICKET")}>
      {!isOpen && renderSettledTicket(market, t)}
      {isOpen && (
        <>
          <div className={TICKET_HEAD_CLASS}>
            <span className={TICKET_TITLE_CLASS}>{t("TRADE")}</span>
            {/* Mutually-exclusive value pickers are radiogroups, not
                tabs — they switch a value, not a panel (misapplied
                tablist semantics promised arrow-key panel switching
                that never existed). */}
            <div
              className={TICKET_MODE_CLASS}
              role="radiogroup"
              aria-label={t("ORDER_TYPE")}
            >
              <button
                type="button"
                role="radio"
                aria-checked={mode === "market"}
                className={ticketModeButtonClass(mode === "market")}
                onClick={() => setMode("market")}
              >
                {t("MARKET_ORDER")}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === "limit"}
                className={ticketModeButtonClass(mode === "limit")}
                onClick={() => isExchange && setMode("limit")}
                disabled={!isExchange}
                title={
                  isExchange
                    ? t("LIMIT_ORDER_TITLE")
                    : t("LIMIT_ORDER_DISABLED_TITLE")
                }
              >
                {t("LIMIT_ORDER")}
              </button>
            </div>
          </div>

          {/* Buy/Sell toggle — only meaningful for exchange markets. AMM stays
            buy-only because the curve only mints; sell support is the
            order-book book's job. */}
          {isExchange && isAuthenticated && (
            <div
              className={`${TICKET_MODE_CLASS} mb-[14px] self-start`}
              role="radiogroup"
              aria-label={t("ACTION")}
            >
              <button
                type="button"
                role="radio"
                aria-checked={action === "buy"}
                className={ticketModeButtonClass(action === "buy")}
                onClick={() => setAction("buy")}
              >
                {t("BUY")}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={action === "sell"}
                className={ticketModeButtonClass(action === "sell")}
                onClick={() => setAction("sell")}
                disabled={availableShares === 0}
                title={
                  availableShares === 0
                    ? t("NO_SHARES_TO_SELL")
                    : t("SELL_UP_TO_SHARES", {
                        quantity: availableShares,
                        side: side.toUpperCase(),
                      })
                }
              >
                {t("SELL")}
              </button>
            </div>
          )}

          <div
            className={TICKET_SIDES_CLASS}
            role="radiogroup"
            aria-label={t("SIDE")}
            onKeyDown={(e) => {
              if (
                e.key === "ArrowLeft" ||
                e.key === "ArrowRight" ||
                e.key === "ArrowUp" ||
                e.key === "ArrowDown"
              ) {
                e.preventDefault();
                setSideAndReset(side === "yes" ? "no" : "yes");
              }
            }}
          >
            <button
              type="button"
              role="radio"
              aria-checked={side === "yes"}
              onClick={() => setSideAndReset("yes")}
              className={ticketSideTabClass("yes", side === "yes")}
            >
              {t("BUY_YES")}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={side === "no"}
              onClick={() => setSideAndReset("no")}
              className={ticketSideTabClass("no", side === "no")}
            >
              {t("BUY_NO")}
            </button>
            <span
              aria-hidden="true"
              className={`${TICKET_SIDE_INDICATOR_CLASS} ${
                side === "yes"
                  ? "translate-x-0 bg-[var(--yes)]"
                  : "translate-x-full bg-[var(--no)]"
              }`}
            />
          </div>

          {/* Limit price input — appears in exchange + limit mode. Bounded
            [1, 99] cents per the engine's price bounds (out-of-range prices
            are rejected at the API). Step is 1¢ to match tick size. */}
          {isExchange && mode === "limit" && (
            <div className="mb-3">
              <div className={TICKET_ROW_CLASS}>
                <span className={TICKET_ROW_LABEL_CLASS}>
                  {t("LIMIT_PRICE_SIDE", { side: side.toUpperCase() })}
                </span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  step={1}
                  value={limitPricePoints}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (Number.isFinite(v)) {
                      setLimitPricePoints(Math.max(1, Math.min(99, v)));
                    }
                  }}
                  className={TICKET_INPUT_CLASS}
                  aria-label={t("LIMIT_PRICE")}
                />
              </div>
              <p className={TICKET_ROW_SUB_CLASS}>
                {t("MID_PRICE", { price: marketPrice })} ·{" "}
                {action === "buy"
                  ? t("LIMIT_BUY_HELP", { price: limitPricePoints })
                  : t("LIMIT_SELL_HELP", { price: limitPricePoints })}
              </p>
            </div>
          )}

          <div className={TICKET_ROWS_CLASS}>
            <div>
              <div className={TICKET_ROW_CLASS}>
                <label
                  className={TICKET_ROW_LABEL_CLASS}
                  htmlFor="ticket-amount"
                >
                  {action === "sell" ? t("SHARES_TO_SELL") : t("AMOUNT")}
                </label>
                <input
                  id="ticket-amount"
                  type="number"
                  min={1}
                  step={1}
                  value={Number.isFinite(amount) ? amount : ""}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setAmount(Number.isFinite(v) ? Math.max(0, v) : 0);
                  }}
                  className={TICKET_INPUT_CLASS}
                  aria-label={
                    action === "sell" ? t("SHARES_TO_SELL") : t("AMOUNT")
                  }
                />
              </div>
              <p className={TICKET_ROW_SUB_CLASS}>
                {action === "sell"
                  ? t("AVAILABLE_SHARES", { quantity: availableShares })
                  : t("BALANCE_AMOUNT", {
                      amount:
                        typeof balance === "number" ? balance.toFixed(2) : "—",
                    })}
              </p>
            </div>

            <div>
              <div className={TICKET_ROW_CLASS}>
                <span className={TICKET_ROW_LABEL_CLASS}>{t("PRICE")}</span>
                <span className={TICKET_ROW_VALUE_CLASS}>
                  {previewLoading ? t("LOADING") : `${summaryPrice}¢`}
                </span>
              </div>
              <p className={TICKET_ROW_SUB_CLASS}>
                {t("IMPLIED_PROB")} {impliedProb}% ·{" "}
                {t("SHARES_COUNT", { quantity: Math.floor(shares) })}
              </p>
              {priceMoved && (
                <p
                  className="mt-1 text-right font-['IBM_Plex_Mono',_monospace] text-[11px] font-semibold text-[var(--t2)]"
                  role="status"
                >
                  {t("PRICE_MOVED", {
                    from: priceMoved.from,
                    to: priceMoved.to,
                  })}
                </p>
              )}
            </div>

            <div className={TICKET_ROW_CLASS}>
              <span className={TICKET_ROW_LABEL_CLASS}>{t("EST_COST")}</span>
              <span className={TICKET_ROW_VALUE_CLASS}>
                {formatPointAmount(effectiveSpend)}
              </span>
            </div>

            {maxLossPoints !== null && (
              <div className={TICKET_ROW_CLASS}>
                <span className={TICKET_ROW_LABEL_CLASS}>
                  {t("MAX_LOSS", "Max loss")}
                </span>
                <span className={TICKET_ROW_VALUE_CLASS}>
                  {formatPointAmount(maxLossPoints)}
                </span>
              </div>
            )}

            {feePoints !== null && (
              <div className={TICKET_ROW_CLASS}>
                <span className={TICKET_ROW_LABEL_CLASS}>
                  {t("FEES", "Fees")}
                </span>
                <span className={TICKET_ROW_VALUE_CLASS}>
                  {formatPointAmount(feePoints)}
                </span>
              </div>
            )}

            <div className={TICKET_ROW_CLASS}>
              <span className={TICKET_ROW_LABEL_CLASS}>
                {t("POINTS_IF_SIDE", { side: side.toUpperCase() })}
              </span>
              <span
                className={`${TICKET_ROW_VALUE_CLASS} ${
                  side === "yes"
                    ? "text-[var(--yes-text)]"
                    : "text-[var(--no-text)]"
                }`}
              >
                {formatPointAmount(pointsIfCorrect)}
              </span>
            </div>
          </div>

          {authLoading ? (
            <button type="button" className={TICKET_CTA_CLASS} disabled>
              {t("CHECKING_SESSION")}
            </button>
          ) : !isAuthenticated ? (
            <>
              <Link href={loginHref} className={TICKET_CTA_CLASS}>
                {t("LOG_IN_TO_TRADE")}
              </Link>
              <p className={TICKET_NOTE_CLASS}>
                {t("SIGN_IN_TO_PLACE_ORDER", { side: side.toUpperCase() })}
              </p>
            </>
          ) : insufficientFunds ? (
            <>
              <button type="button" className={TICKET_CTA_CLASS} disabled>
                {t("NOT_ENOUGH_POINTS")}
              </button>
              <p className={TICKET_NOTE_CLASS} role="alert">
                {t("BALANCE_BELOW_ORDER", {
                  amount: formatPointAmount(amount),
                })}
              </p>
            </>
          ) : marketBuyHasNoLiquidity ? (
            <>
              <button type="button" className={TICKET_CTA_CLASS} disabled>
                {t("ORDER_STATUS", { status: t("CANCELLED_NO_LIQUIDITY") })}
              </button>
              <p className={TICKET_NOTE_CLASS} role="alert">
                {t("ORDER_STATUS_BODY", {
                  quantity: requestedQuantity,
                  side: side.toUpperCase(),
                  ticker: market.ticker,
                  reason: t("CANCELLED_NO_LIQUIDITY"),
                })}
              </p>
            </>
          ) : isAmmQuoteOnly ? (
            <>
              <button type="button" className={TICKET_CTA_CLASS} disabled>
                {t("AMM_QUOTE_ONLY", "Quote only")}
              </button>
              <p className={TICKET_NOTE_CLASS} role="status">
                {t(
                  "AMM_QUOTE_ONLY_DETAIL",
                  "This legacy AMM market is shown for curve and impact inspection. New orders use order-book markets.",
                )}
              </p>
            </>
          ) : insufficientShares ? (
            <>
              <button type="button" className={TICKET_CTA_CLASS} disabled>
                {t("NOT_ENOUGH_SHARES")}
              </button>
              <p className={TICKET_NOTE_CLASS} role="alert">
                {t("NOT_ENOUGH_SHARES_DETAIL", {
                  available: availableShares,
                  side: side.toUpperCase(),
                  quantity: Math.floor(quantity),
                })}
              </p>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className={TICKET_CTA_CLASS}
              disabled={submitting || quantity < 1 || priceGuard}
            >
              {/*
                Label says "Place trade", not "Review trade", because
                clicking this button submits the order immediately. The
                quote panel above already shows fill price, shares, and
                points if correct — that IS the review surface. A "Review" label
                would imply a confirm modal that does not exist and was
                a stage gotcha during the 2026-05-03 demo dry-run.

                priceGuard: an 800ms pause after a live quote move — the
                user re-confirms a changed price deliberately.
              */}
              {confirmed && (
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full bg-[var(--brand-dot)] animate-[tap-land_400ms_ease-out]"
                />
              )}
              {submitting
                ? t("PLACING")
                : priceGuard
                  ? t("PRICE_UPDATED", "Price updated…")
                  : t(
                      action === "sell" ? "SELL_AMOUNT" : "PLACE_TRADE_AMOUNT",
                      {
                        amount: formatPointAmount(amount),
                      },
                    )}
            </button>
          )}

          <p className={TICKET_TRUST_CLASS}>
            {t("TRADE_TRUST_NOTE", {
              price: summaryPrice,
              probability: impliedProb,
            })}
          </p>

          {/* Resolution provenance at the money moment (P10): who decides,
              and when the market closes — one quiet line, no jargon. */}
          {settlementSource && (
            <p className={TICKET_TRUST_CLASS}>
              {t("RESOLVES_BY", { source: settlementSource })} ·{" "}
              {new Date(market.closeAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          )}

          {/* Suppress unused-warning: API surface preserved for Phase 4 */}
          <input type="hidden" value={otherPrice} readOnly />

          {error &&
            (complianceDenialKind(error) ? (
              // Jurisdiction/KYC gate denial from the gateway: surface the
              // user-readable reason as a banner; KYC denials deep-link to
              // verification.
              <div className={TICKET_COMPLIANCE_CLASS} role="alert">
                {error}
                {complianceDenialKind(error) === "kyc" && (
                  <Link
                    href="/profile"
                    className="mt-1.5 block font-semibold text-[var(--t1)] underline"
                  >
                    {t("COMPLETE_VERIFICATION")}
                  </Link>
                )}
              </div>
            ) : (
              <div className={TICKET_ERROR_CLASS}>{error}</div>
            ))}
        </>
      )}
    </section>
  );
}
