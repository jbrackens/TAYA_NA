"use client";

/**
 * DemoCheckout — the simulated provider panel for a pending purchase.
 *
 * Honestly labeled: a persistent "Demo checkout — simulated, no real charge"
 * banner sits above a legitimate-looking order panel. The four demo outcome
 * controls map 1:1 to the gateway's demo provider outcomes (success /
 * failure / cancel / delayed). Buttons disable while a confirmation is in
 * flight so a double-click cannot double-submit (the server is idempotent
 * regardless — duplicate confirms are 200 no-ops).
 */

import { useTranslation } from "react-i18next";
import type {
  StoreDemoOutcome,
  StorePurchase,
} from "../../lib/api/store-client";
import { formatUsdCents } from "../../lib/usd";

const BANNER_CLASS =
  "mb-3 rounded-[var(--r-rh-sm)] border border-[rgba(255,155,107,0.3)] bg-[rgba(255,155,107,0.1)] p-2.5 text-center text-xs font-semibold leading-[1.45] text-[var(--no-text)]";
const PANEL_CLASS =
  "rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-5";
const PANEL_TITLE_CLASS =
  "m-0 mb-1 text-sm font-semibold tracking-[-0.01em] text-[var(--t1)]";
const PANEL_SUB_CLASS = "m-0 mb-4 text-xs leading-[1.5] text-[var(--t3)]";
const REF_ROW_CLASS =
  "mb-4 flex flex-col gap-1.5 rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-2)] p-3 text-[11px] text-[var(--t3)]";
const REF_LINE_CLASS =
  "flex items-center justify-between gap-3 overflow-hidden";
const REF_VALUE_CLASS =
  "overflow-hidden text-ellipsis whitespace-nowrap font-['IBM_Plex_Mono',_monospace] text-[var(--t2)] [font-variant-numeric:tabular-nums]";
const PAY_CLASS =
  "flex w-full cursor-pointer items-center justify-center rounded-md border-0 bg-[var(--accent)] px-4 py-[14px] [font-family:inherit] text-[15px] font-semibold text-[#061a10] transition-[filter,transform] duration-[120ms] [&:not(:disabled):hover]:-translate-y-px [&:not(:disabled):hover]:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-[0.45]";
const ALT_GROUP_CLASS = "mt-4 border-t border-[var(--border-1)] pt-3.5";
const ALT_TITLE_CLASS =
  "m-0 mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--t3)]";
const ALT_ROW_CLASS = "flex flex-wrap gap-2";
const ALT_BUTTON_CLASS =
  "min-h-11 flex-1 cursor-pointer whitespace-nowrap rounded-md border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2 [font-family:inherit] text-xs font-semibold text-[var(--t2)] transition-colors duration-[120ms] hover:border-[var(--border-2)] hover:bg-[var(--surface-2)] hover:text-[var(--t1)] disabled:cursor-not-allowed disabled:opacity-[0.45]";

export interface DemoCheckoutProps {
  purchase: StorePurchase;
  processing: boolean;
  onOutcome: (outcome: StoreDemoOutcome) => void;
}

export function DemoCheckout({
  purchase,
  processing,
  onOutcome,
}: DemoCheckoutProps) {
  const { t } = useTranslation("store");
  return (
    <div>
      <div className={BANNER_CLASS} role="status">
        {t("checkout.banner", "Demo checkout — simulated, no real charge")}
      </div>
      <section
        className={PANEL_CLASS}
        aria-label={t("checkout.title", "Simulated checkout")}
      >
        <h2 className={PANEL_TITLE_CLASS}>
          {t("checkout.title", "Simulated checkout")}
        </h2>
        <p className={PANEL_SUB_CLASS}>
          {t(
            "checkout.subtitle",
            "Pick an outcome below to finish this simulated checkout. Points are added only on a completed checkout.",
          )}
        </p>
        <div className={REF_ROW_CLASS}>
          <span className={REF_LINE_CLASS}>
            <span>{t("checkout.orderRef", "Order reference")}</span>
            <span className={REF_VALUE_CLASS}>{purchase.id}</span>
          </span>
          <span className={REF_LINE_CLASS}>
            <span>{t("checkout.provider", "Provider")}</span>
            <span className={REF_VALUE_CLASS}>
              {t("checkout.providerDemo", "Demo (simulated)")}
            </span>
          </span>
          <span className={REF_LINE_CLASS}>
            <span>{t("checkout.amount", "Amount")}</span>
            <span className={REF_VALUE_CLASS}>
              {formatUsdCents(purchase.priceUsdCents)}
            </span>
          </span>
        </div>
        <button
          type="button"
          data-testid="checkout-pay"
          className={PAY_CLASS}
          disabled={processing}
          onClick={() => onOutcome("success")}
        >
          {processing
            ? t("checkout.processing", "Processing…")
            : t("checkout.pay", "Complete simulated checkout")}
        </button>
        <div className={ALT_GROUP_CLASS}>
          <h3 className={ALT_TITLE_CLASS}>
            {t("checkout.outcomes", "Other demo outcomes")}
          </h3>
          <div className={ALT_ROW_CLASS}>
            <button
              type="button"
              data-testid="checkout-fail"
              className={ALT_BUTTON_CLASS}
              disabled={processing}
              onClick={() => onOutcome("failure")}
            >
              {t("checkout.fail", "Simulate a decline")}
            </button>
            <button
              type="button"
              data-testid="checkout-delay"
              className={ALT_BUTTON_CLASS}
              disabled={processing}
              onClick={() => onOutcome("delayed")}
            >
              {t("checkout.delay", "Simulate delayed completion")}
            </button>
            <button
              type="button"
              data-testid="checkout-cancel"
              className={ALT_BUTTON_CLASS}
              disabled={processing}
              onClick={() => onOutcome("cancel")}
            >
              {t("checkout.cancel", "Cancel checkout")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
