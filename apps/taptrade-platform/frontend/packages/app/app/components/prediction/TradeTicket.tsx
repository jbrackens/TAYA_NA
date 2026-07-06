"use client";

/**
 * TradeTicket — warm-light trade form on /market/[ticker].
 *
 * Layout (DESIGN.md §6 + §8):
 *   Title + mode switcher (Market / Limit)
 *   YES/NO side selector
 *   Points block + chips + balance
 *   Summary rows (avg fill, slippage, shares, points if correct)
 *   Auth-aware CTA
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

import { useState, useCallback, useEffect, useMemo } from "react";
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
  pricePointsCents?: number;
  action?: OrderAction;
  timeInForce?: TimeInForce;
  postOnly?: boolean;
  notionalCapPointsCents?: number;
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

const QUICK_AMOUNTS = [5, 25, 100] as const;

type TicketMode = "market" | "limit";

const TICKET_CARD_CLASS =
  "rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-5 font-['Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif]";
const TICKET_HEAD_CLASS = "mb-[14px] flex items-center justify-between";
const TICKET_TITLE_CLASS =
  "text-sm font-semibold tracking-[-0.01em] text-[var(--t1)]";
const TICKET_MODE_CLASS =
  "inline-flex gap-0.5 rounded-md border border-[var(--border-1)] bg-white/[0.04] p-[3px]";
const TICKET_MODE_BUTTON_BASE_CLASS =
  "cursor-pointer rounded-md border-0 px-3 py-[5px] [font-family:inherit] text-[11px] font-semibold transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-40 disabled:text-[var(--t3)] disabled:hover:bg-transparent disabled:hover:text-[var(--t3)]";
const TICKET_SIDES_CLASS = "mb-4 grid grid-cols-2 gap-2.5";
const TICKET_SIDE_BASE_CLASS =
  "relative cursor-pointer rounded-[var(--r-rh-md)] border p-[14px] [font-family:inherit] text-left text-[var(--t1)] transition-colors duration-[120ms] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--accent-soft)]";
const TICKET_SIDE_LABEL_CLASS =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--t3)]";
const TICKET_SIDE_PRICE_CLASS =
  "block font-['IBM_Plex_Mono',_monospace] text-[28px] font-semibold leading-none tracking-[-0.02em] text-[var(--t1)] [font-variant-numeric:tabular-nums]";
const TICKET_SIDE_SUB_CLASS =
  "mt-1.5 block font-['IBM_Plex_Mono',_monospace] text-[11px] text-[var(--t3)] [font-variant-numeric:tabular-nums]";
const TICKET_AMOUNT_CLASS = "mb-[14px]";
const TICKET_AMOUNT_HEAD_CLASS = "mb-2 flex items-baseline justify-between";
const TICKET_AMOUNT_LABEL_CLASS = "text-xs font-medium text-[var(--t3)]";
const TICKET_AMOUNT_BALANCE_CLASS =
  "font-['IBM_Plex_Mono',_monospace] text-[11px] text-[var(--t3)] [font-variant-numeric:tabular-nums]";
const TICKET_LIMIT_INPUT_CLASS =
  "w-full rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-2.5 font-['IBM_Plex_Mono',_monospace] text-[22px] text-[var(--t1)] outline-none [font-variant-numeric:tabular-nums]";
const TICKET_LIMIT_HELP_CLASS =
  "mt-1.5 font-['IBM_Plex_Mono',_monospace] text-[11px] text-[var(--t3)]";
const TICKET_AMOUNT_DISPLAY_CLASS =
  "mb-2.5 flex items-center justify-between rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-white/[0.02] p-[14px]";
const TICKET_AMOUNT_VALUE_CLASS =
  "font-['IBM_Plex_Mono',_monospace] text-[28px] font-medium leading-none tracking-[-0.02em] text-[var(--t1)] [font-variant-numeric:tabular-nums]";
const TICKET_AMOUNT_SUB_CLASS =
  "text-right font-['IBM_Plex_Mono',_monospace] text-[10px] leading-[1.4] text-[var(--t3)] [font-variant-numeric:tabular-nums]";
const TICKET_CHIPS_CLASS = "grid grid-cols-4 gap-1.5";
const TICKET_CHIP_BASE_CLASS =
  "cursor-pointer rounded-md border-0 px-1 py-2 font-['IBM_Plex_Mono',_monospace] text-xs font-semibold transition-colors duration-[120ms] [font-variant-numeric:tabular-nums]";
const TICKET_SUMMARY_CLASS =
  "mt-[14px] flex flex-col gap-2 border-t border-[var(--border-1)] pt-[14px] font-['IBM_Plex_Mono',_monospace] text-xs [font-variant-numeric:tabular-nums]";
const TICKET_SUMMARY_ROW_CLASS = "flex justify-between";
const TICKET_CTA_CLASS =
  "mt-4 flex w-full cursor-pointer items-center justify-center rounded-md border-0 bg-[var(--accent)] px-4 py-[14px] [font-family:inherit] text-[15px] font-semibold text-[#061a10] no-underline transition-[filter,transform] duration-[120ms] [&:not(:disabled):hover]:-translate-y-px [&:not(:disabled):hover]:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-[0.45] disabled:filter-none disabled:transform-none";
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
      ? "bg-[var(--accent)] text-[#061a10]"
      : "bg-transparent text-[var(--t3)] hover:text-[var(--t1)]"
  }`;
}

function ticketSideClass(side: OrderSide, selected: boolean): string {
  const selectedClass =
    side === "yes"
      ? "border-[rgba(113,238,184,0.4)] bg-[var(--yes-soft)]"
      : "border-[rgba(255,139,107,0.4)] bg-[var(--no-soft)]";
  return `${TICKET_SIDE_BASE_CLASS} ${
    selected
      ? selectedClass
      : "border-[var(--border-1)] bg-white/[0.02] hover:bg-white/[0.04]"
  }`;
}

function selectedSideTextClass(side: OrderSide, selected: boolean): string {
  if (!selected) return "";
  return side === "yes" ? "text-[var(--yes-text)]" : "text-[var(--no-text)]";
}

function ticketChipClass(active: boolean): string {
  return `${TICKET_CHIP_BASE_CLASS} ${
    active
      ? "bg-[var(--accent)] text-[#061a10]"
      : "bg-white/[0.04] text-[var(--t2)] hover:bg-white/[0.08] hover:text-[var(--t1)]"
  }`;
}

function formatPointAmount(points: number): string {
  return `${points.toFixed(2)} pts`;
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
  defaultAmount = 25,
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
  const [limitPriceCents, setLimitPriceCents] = useState<number>(
    side === "yes" ? market.yesPricePointsCents : market.noPricePointsCents,
  );
  const [preview, setPreview] = useState<OrderPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    setSide(defaultSide);
    onSideChange?.(defaultSide);
  }, [defaultSide, onSideChange]);

  const isOpen = market.status === "open";
  const isExchange = market.executionMode === "order_book";
  const isAmmQuoteOnly = market.executionMode === "amm";
  const marketPrice =
    side === "yes" ? market.yesPricePointsCents : market.noPricePointsCents;
  // Effective price drives quantity math: limit orders use the user's price
  // (capped to [1, 99] at the API boundary); market orders use the snapshot.
  const price = mode === "limit" && isExchange ? limitPriceCents : marketPrice;
  const otherPrice =
    side === "yes" ? market.noPricePointsCents : market.yesPricePointsCents;
  const availableShares =
    side === "yes" ? availableYesShares : availableNoShares;

  // quantity = # of contracts; cost = quantity * price / 100
  const quantity = useMemo(
    () => (price > 0 ? Math.max(0, amount / (price / 100)) : 0),
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
      opts.pricePointsCents = limitPriceCents;
      opts.timeInForce = "gtc";
    } else if (action === "buy") {
      opts.notionalCapPointsCents = Math.ceil(amount * 100);
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
    limitPriceCents,
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
  const pointsIfCorrect = shares * 1; // Correct contracts settle at 1 point each.
  const summaryPrice =
    preview?.averageFillPricePointsCents || preview?.pricePointsCents || price;
  const impliedProb = summaryPrice; // cents are already 0-100, readable as %
  const effectiveSpend =
    action === "buy" &&
    mode === "market" &&
    typeof preview?.totalCostWithFeesPointsCents === "number"
      ? preview.totalCostWithFeesPointsCents / 100
      : amount;
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
  const loginReturnPath = `/market/${market.ticker}?side=${side}&amount=${amount.toFixed(2)}`;
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
        opts.pricePointsCents = limitPriceCents;
        // Default time-in-force gtc; advanced section can override later.
        opts.timeInForce = "gtc";
      } else if (action === "buy") {
        opts.notionalCapPointsCents = Math.ceil(amount * 100);
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
          mode === "limit" ? `${limitPriceCents}¢` : `${price}¢`;
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
    limitPriceCents,
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
            <div
              className={TICKET_MODE_CLASS}
              role="tablist"
              aria-label={t("ORDER_TYPE")}
            >
              <button
                role="tab"
                aria-selected={mode === "market"}
                className={ticketModeButtonClass(mode === "market")}
                onClick={() => setMode("market")}
              >
                {t("MARKET_ORDER")}
              </button>
              <button
                role="tab"
                aria-selected={mode === "limit"}
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
              role="tablist"
              aria-label={t("ACTION")}
            >
              <button
                role="tab"
                aria-selected={action === "buy"}
                className={ticketModeButtonClass(action === "buy")}
                onClick={() => setAction("buy")}
              >
                {t("BUY")}
              </button>
              <button
                role="tab"
                aria-selected={action === "sell"}
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
            role="tablist"
            aria-label={t("SIDE")}
          >
            <button
              role="tab"
              aria-selected={side === "yes"}
              onClick={() => setSideAndReset("yes")}
              className={ticketSideClass("yes", side === "yes")}
            >
              <span
                className={`${TICKET_SIDE_LABEL_CLASS} ${selectedSideTextClass("yes", side === "yes")}`}
              >
                {t("YES")}
              </span>
              <span
                className={`${TICKET_SIDE_PRICE_CLASS} ${selectedSideTextClass("yes", side === "yes")}`}
              >
                {market.yesPricePointsCents}¢
              </span>
              <span className={TICKET_SIDE_SUB_CLASS}>
                {market.yesPricePointsCents >= 50 ? "+" : "−"}
                {Math.abs(market.yesPricePointsCents - 50)} ·{" "}
                {market.yesPricePointsCents}% {t("PROB")}
              </span>
            </button>
            <button
              role="tab"
              aria-selected={side === "no"}
              onClick={() => setSideAndReset("no")}
              className={ticketSideClass("no", side === "no")}
            >
              <span
                className={`${TICKET_SIDE_LABEL_CLASS} ${selectedSideTextClass("no", side === "no")}`}
              >
                {t("NO")}
              </span>
              <span
                className={`${TICKET_SIDE_PRICE_CLASS} ${selectedSideTextClass("no", side === "no")}`}
              >
                {market.noPricePointsCents}¢
              </span>
              <span className={TICKET_SIDE_SUB_CLASS}>
                {market.noPricePointsCents >= 50 ? "+" : "−"}
                {Math.abs(market.noPricePointsCents - 50)} ·{" "}
                {market.noPricePointsCents}%{t("PROB")}
              </span>
            </button>
          </div>

          {/* Limit price input — appears in exchange + limit mode. Bounded
            [1, 99] cents per the engine's price bounds (out-of-range prices
            are rejected at the API). Step is 1¢ to match tick size. */}
          {isExchange && mode === "limit" && (
            <div className={TICKET_AMOUNT_CLASS} aria-label={t("LIMIT_PRICE")}>
              <div className={TICKET_AMOUNT_HEAD_CLASS}>
                <span className={TICKET_AMOUNT_LABEL_CLASS}>
                  {t("LIMIT_PRICE_SIDE", { side: side.toUpperCase() })}
                </span>
                <span className={TICKET_AMOUNT_BALANCE_CLASS}>
                  {t("MID_PRICE", { price: marketPrice })}
                </span>
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
                className={TICKET_LIMIT_INPUT_CLASS}
              />
              <p className={TICKET_LIMIT_HELP_CLASS}>
                {action === "buy"
                  ? t("LIMIT_BUY_HELP", { price: limitPriceCents })
                  : t("LIMIT_SELL_HELP", { price: limitPriceCents })}
              </p>
            </div>
          )}

          <div className={TICKET_AMOUNT_CLASS}>
            <div className={TICKET_AMOUNT_HEAD_CLASS}>
              <span className={TICKET_AMOUNT_LABEL_CLASS}>
                {action === "sell" ? t("SHARES_TO_SELL") : t("AMOUNT")}
              </span>
              <span className={TICKET_AMOUNT_BALANCE_CLASS}>
                {action === "sell"
                  ? t("AVAILABLE_SHARES", { quantity: availableShares })
                  : t("BALANCE_AMOUNT", {
                      amount:
                        typeof balance === "number" ? balance.toFixed(2) : "—",
                    })}
              </span>
            </div>
            <div className={TICKET_AMOUNT_DISPLAY_CLASS}>
              <div className={TICKET_AMOUNT_VALUE_CLASS}>
                {formatPointAmount(amount)}
              </div>
              <div className={TICKET_AMOUNT_SUB_CLASS}>
                {t("SHARES_COUNT", { quantity: Math.floor(shares) })}
                <br />
                {t("POTENTIAL_POINTS")}{" "}
                <span className="font-semibold text-[var(--yes-text)]">
                  {formatPointAmount(pointsIfCorrect)}
                </span>
              </div>
            </div>
            <div
              className={TICKET_CHIPS_CLASS}
              role="group"
              aria-label={t("QUICK_AMOUNT")}
            >
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
                    className={ticketChipClass(isActive)}
                  >
                    {formatPointAmount(a)}
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
                className={ticketChipClass(false)}
                disabled={typeof balance !== "number" || balance <= 0}
              >
                {t("MAX")}
              </button>
            </div>
          </div>

          <div className={TICKET_SUMMARY_CLASS}>
            <div className={TICKET_SUMMARY_ROW_CLASS}>
              <span className="text-[var(--t3)]">{t("AVG_FILL_PRICE")}</span>
              <span className="text-[var(--t1)]">
                {previewLoading ? t("LOADING") : `${summaryPrice}¢`}
              </span>
            </div>
            <div className={TICKET_SUMMARY_ROW_CLASS}>
              <span className="text-[var(--t3)]">{t("IMPLIED_PROB")}</span>
              <span className="text-[var(--t1)]">{impliedProb}%</span>
            </div>
            <div className={TICKET_SUMMARY_ROW_CLASS}>
              <span className="text-[var(--t3)]">{t("SHARES")}</span>
              <span className="text-[var(--t1)]">{shares.toFixed(2)}</span>
            </div>
            <div className={TICKET_SUMMARY_ROW_CLASS}>
              <span className="text-[var(--t3)]">
                {t("POINTS_IF_SIDE", { side: side.toUpperCase() })}
              </span>
              <span className="text-[var(--yes-text)]">
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
              disabled={submitting || quantity < 1}
            >
              {/*
                Label says "Place trade", not "Review trade", because
                clicking this button submits the order immediately. The
                quote panel above already shows fill price, shares, and
                points if correct — that IS the review surface. A "Review" label
                would imply a confirm modal that does not exist and was
                a stage gotcha during the 2026-05-03 demo dry-run.
              */}
              {submitting
                ? t("PLACING")
                : t(action === "sell" ? "SELL_AMOUNT" : "PLACE_TRADE_AMOUNT", {
                    amount: formatPointAmount(amount),
                  })}
            </button>
          )}

          <p className={TICKET_TRUST_CLASS}>
            {t("TRADE_TRUST_NOTE", {
              price: summaryPrice,
              probability: impliedProb,
            })}
          </p>

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
