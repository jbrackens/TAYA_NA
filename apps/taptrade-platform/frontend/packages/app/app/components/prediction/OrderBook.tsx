"use client";

/**
 * OrderBook — a wire price table (P11 "Standing Question", 2026-07-12).
 *
 * Shows the top N ask levels (NO side) descending, a spread strip, then
 * the top N bid levels (YES side) descending. Depth bars render as
 * row ::after gradients (CSS lives here; data sets --depth per row).
 * Flat on the paper: rubric header over a strong rule, mono figures.
 *
 * Callers pass real /orderbook levels only. AMM markets render a separate
 * liquidity-model snapshot.
 */

import { useTranslation } from "react-i18next";

interface BookLevel {
  pricePoints: number;
  shares: number;
  cumulativeShares: number;
}

interface OrderBookProps {
  bids: BookLevel[];
  asks: BookLevel[];
  maxDepth?: number;
}

const ORDER_BOOK_CARD_CLASS = "font-sans";
const ORDER_BOOK_HEAD_CLASS =
  "mb-2 flex items-baseline justify-between border-t border-[var(--border-2)] pt-2";
const ORDER_BOOK_TITLE_CLASS =
  "text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--t1)]";
const ORDER_BOOK_SUB_CLASS =
  "font-mono text-[11px] text-[var(--t3)] [font-variant-numeric:tabular-nums]";
const ORDER_BOOK_TABLE_CLASS =
  "relative isolate w-full border-collapse font-mono text-[13px] [font-variant-numeric:tabular-nums]";
const ORDER_BOOK_TH_CLASS =
  "border-b border-[var(--border-1)] px-2.5 py-1.5 text-left font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--t3)]";
const ORDER_BOOK_TD_CLASS = "relative px-2.5 py-[7px] text-[var(--t1)]";
const ORDER_BOOK_DEPTH_ROW_CLASS =
  "relative after:pointer-events-none after:absolute after:top-[3px] after:right-0 after:bottom-[3px] after:z-[-1] after:w-[calc(var(--depth,0)*1%)] after:content-['']";
const ORDER_BOOK_SPREAD_CLASS =
  "my-1 flex items-center justify-center border-y border-[var(--border-1)] py-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--t3)]";

export default function OrderBook({ bids, asks, maxDepth }: OrderBookProps) {
  const { t } = useTranslation("prediction");
  const bestBid = bids[0]?.pricePoints ?? 0;
  const bestAsk = asks[asks.length - 1]?.pricePoints ?? 0;
  const mid =
    bestBid && bestAsk ? Math.round((bestBid + (100 - bestAsk)) / 2) : 0;
  const spread = bestBid && bestAsk ? Math.abs(100 - bestAsk - bestBid) : 0;
  const maxSize = Math.max(
    maxDepth ?? 0,
    ...bids.map((l) => l.shares),
    ...asks.map((l) => l.shares),
    1,
  );

  return (
    <section className={ORDER_BOOK_CARD_CLASS} aria-label={t("ORDER_BOOK")}>
      <div className={ORDER_BOOK_HEAD_CLASS}>
        <span className={ORDER_BOOK_TITLE_CLASS}>{t("ORDER_BOOK")}</span>
        <span className={ORDER_BOOK_SUB_CLASS}>
          {t("AGGREGATED_LEVELS", { count: asks.length + bids.length })}
        </span>
      </div>

      {asks.length + bids.length === 0 ? (
        <div className="py-4 text-center text-xs text-[var(--t3)]">
          {t("NO_RESTING_ORDERS")}
        </div>
      ) : (
        <>
          {asks.length > 0 && (
            <table className={ORDER_BOOK_TABLE_CLASS}>
              <caption className="sr-only">
                {t("ORDER_BOOK_ASKS_CAPTION", "Order book — sell (No) side")}
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={ORDER_BOOK_TH_CLASS}>
                    {t("SIDE")}
                  </th>
                  <th
                    scope="col"
                    className={`${ORDER_BOOK_TH_CLASS} text-right`}
                  >
                    {t("PRICE")}
                  </th>
                  <th
                    scope="col"
                    className={`${ORDER_BOOK_TH_CLASS} text-right`}
                  >
                    {t("SIZE")}
                  </th>
                  <th
                    scope="col"
                    className={`${ORDER_BOOK_TH_CLASS} text-right`}
                  >
                    {t("TOTAL")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {asks.map((l) => (
                  <tr
                    key={`ask-${l.pricePoints}`}
                    className={`${ORDER_BOOK_DEPTH_ROW_CLASS} after:bg-[linear-gradient(90deg,_transparent,_var(--no-soft))]`}
                    style={{
                      ["--depth" as string]: Math.min(
                        100,
                        (l.shares / maxSize) * 100,
                      ),
                    }}
                  >
                    <td
                      className={`${ORDER_BOOK_TD_CLASS} font-semibold text-[var(--no-text)]`}
                    >
                      {t("NO")} {100 - l.pricePoints}¢
                    </td>
                    <td className={`${ORDER_BOOK_TD_CLASS} text-right`}>
                      {l.shares}
                    </td>
                    <td className={`${ORDER_BOOK_TD_CLASS} text-right`}>
                      {(l.shares * (100 - l.pricePoints)).toFixed(2)}
                    </td>
                    <td className={`${ORDER_BOOK_TD_CLASS} text-right`}>
                      {(
                        (l.cumulativeShares * (100 - l.pricePoints)) /
                        100
                      ).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {bestBid > 0 && bestAsk > 0 && (
            <div className={ORDER_BOOK_SPREAD_CLASS}>
              {t("SPREAD_MID", { spread, mid })}
            </div>
          )}

          {bids.length > 0 && (
            <table className={ORDER_BOOK_TABLE_CLASS}>
              <caption className="sr-only">
                {t("ORDER_BOOK_BIDS_CAPTION", "Order book — buy (Yes) side")}
              </caption>
              {/* A11y (2026-07-12): the bids table previously had no header
                  row at all — cells were unlabeled for screen readers. The
                  design shows one visible header (on the asks table) for the
                  whole book, so this one mirrors it visually hidden. */}
              <thead className="sr-only">
                <tr>
                  <th scope="col">{t("SIDE")}</th>
                  <th scope="col">{t("PRICE")}</th>
                  <th scope="col">{t("SIZE")}</th>
                  <th scope="col">{t("TOTAL")}</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((l) => (
                  <tr
                    key={`bid-${l.pricePoints}`}
                    className={`${ORDER_BOOK_DEPTH_ROW_CLASS} after:bg-[linear-gradient(90deg,_transparent,_var(--yes-soft))]`}
                    style={{
                      ["--depth" as string]: Math.min(
                        100,
                        (l.shares / maxSize) * 100,
                      ),
                    }}
                  >
                    <td
                      className={`${ORDER_BOOK_TD_CLASS} font-semibold text-[var(--yes-text)]`}
                    >
                      {t("YES")} {l.pricePoints}¢
                    </td>
                    <td className={`${ORDER_BOOK_TD_CLASS} text-right`}>
                      {l.shares}
                    </td>
                    <td className={`${ORDER_BOOK_TD_CLASS} text-right`}>
                      {(l.shares * l.pricePoints).toFixed(0)}
                    </td>
                    <td className={`${ORDER_BOOK_TD_CLASS} text-right`}>
                      {((l.cumulativeShares * l.pricePoints) / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}

export type { BookLevel };
