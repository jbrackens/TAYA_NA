"use client";

/**
 * RecentTrades — the trade tape as a wire table
 * (P11 "Standing Question", 2026-07-12).
 *
 * Each row is YES/NO side · price · size · time-ago. Flat on the paper:
 * rubric header over a strong rule, hairline row separators, plain
 * labeled side text (print tables don't wear chips), mono figures.
 */

import { useTranslation } from "react-i18next";
import type { Trade } from "@taptrade-ui/api-client/src/prediction-types";

interface RecentTradesProps {
  trades: Trade[];
  limit?: number;
}

function timeAgo(iso: string, now: number = Date.now()): string {
  const delta = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (delta < 60) return `${Math.floor(delta)}s`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h`;
  return `${Math.floor(delta / 86400)}d`;
}

/**
 * Render row for the trade tape. Either a single secondary trade or a
 * collapsed issuance pair (two rows from the gateway sharing matchId).
 */
type TapeRow =
  | { kind: "secondary"; trade: Trade }
  | {
      kind: "issuance";
      matchId: string;
      yesTrade: Trade;
      noTrade: Trade;
    };

/**
 * Collapse trades into tape rows. Issuance trades arrive as two trade
 * rows from /trades sharing a matchId — group them so the tape shows
 * one line per match (with both YES and NO prices) instead of two
 * apparently-duplicate lines. Secondary trades pass through 1:1.
 *
 * Order is preserved by first-occurrence timestamp.
 */
function collapseTrades(trades: Trade[]): TapeRow[] {
  const seen = new Map<string, TapeRow>();
  const order: string[] = [];
  for (const t of trades) {
    if (t.tradeKind === "issuance" && t.matchId) {
      const existing = seen.get(t.matchId);
      if (!existing) {
        const row: TapeRow = {
          kind: "issuance",
          matchId: t.matchId,
          yesTrade: t.side === "yes" ? t : t,
          noTrade: t.side === "no" ? t : t,
        };
        // Initial fill: one side known, other will arrive next.
        seen.set(t.matchId, row);
        order.push(t.matchId);
      } else if (existing.kind === "issuance") {
        if (t.side === "yes") existing.yesTrade = t;
        else existing.noTrade = t;
      }
    } else {
      // Secondary or untagged (legacy AMM trades have no matchId/tradeKind).
      const key = t.id;
      seen.set(key, { kind: "secondary", trade: t });
      order.push(key);
    }
  }
  return order.map((k) => seen.get(k)!).filter(Boolean);
}

const RECENT_TRADES_CARD_CLASS = "font-sans";
const RECENT_TRADES_HEAD_CLASS =
  "mb-2 flex items-baseline justify-between border-t border-[var(--border-2)] pt-2";
const RECENT_TRADES_TITLE_CLASS =
  "text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--t1)]";
const RECENT_TRADES_SUB_CLASS =
  "font-mono text-[11px] text-[var(--t3)] [font-variant-numeric:tabular-nums]";
const RECENT_TRADES_TAPE_CLASS =
  "flex max-h-[264px] flex-col overflow-hidden font-mono text-xs [font-variant-numeric:tabular-nums]";
const RECENT_TRADES_ROW_CLASS =
  "grid grid-cols-[56px_52px_1fr_52px] items-center gap-2 border-b border-[var(--border-1)] px-0.5 py-1.5 text-[var(--t1)] last:border-b-0";
// P11: side markers are plain labeled wire text — print tables don't
// wear chips. --yes-text/--no-text always travel WITH the text label.
const RECENT_TRADES_SIDE_BASE_CLASS =
  "text-[10px] font-bold uppercase tracking-[0.08em]";
const RECENT_TRADES_SIZE_CLASS = "text-[11px] text-[var(--t2)]";
const RECENT_TRADES_TIME_CLASS = "text-right text-[10px] text-[var(--t3)]";

function tradeSideClass(side: "yes" | "no" | "mint"): string {
  const color =
    side === "yes"
      ? "text-[var(--yes-text)]"
      : side === "no"
        ? "text-[var(--no-text)]"
        : "text-[var(--accent-text)]";
  return `${RECENT_TRADES_SIDE_BASE_CLASS} ${color}`;
}

function tradePriceClass(side?: "yes" | "no"): string {
  const color =
    side === "yes"
      ? "text-[var(--yes-text)]"
      : side === "no"
        ? "text-[var(--no-text)]"
        : "";
  return `font-semibold ${color}`;
}

function formatTradePoints(points: number): string {
  return `${points.toFixed(2)} pts`;
}

export default function RecentTrades({
  trades,
  limit = 12,
}: RecentTradesProps) {
  const { t } = useTranslation("prediction");
  const collapsed = collapseTrades(trades);
  const visible = collapsed.slice(0, limit);

  return (
    <section
      className={RECENT_TRADES_CARD_CLASS}
      aria-label={t("RECENT_TRADES")}
    >
      <div className={RECENT_TRADES_HEAD_CLASS}>
        <span className={RECENT_TRADES_TITLE_CLASS}>{t("RECENT_TRADES")}</span>
        <span className={RECENT_TRADES_SUB_CLASS}>
          {visible.length > 0
            ? t("LAST_COUNT", { count: visible.length })
            : t("TAPE")}
        </span>
      </div>
      {visible.length === 0 ? (
        <div className="py-5 text-center text-xs text-[var(--t3)]">
          {t("NO_RECENT_TRADES")}
        </div>
      ) : (
        <div className={RECENT_TRADES_TAPE_CLASS}>
          {visible.map((row) => {
            if (row.kind === "issuance") {
              // Both sides minted in one match. Show a "MINT" pill and
              // both prices side-by-side. Contract size is displayed in points.
              const yPx = row.yesTrade.pricePoints;
              const nPx = row.noTrade.pricePoints;
              const qty = row.yesTrade.quantity;
              const size = qty;
              return (
                <div key={row.matchId} className={RECENT_TRADES_ROW_CLASS}>
                  <span
                    className={tradeSideClass("mint")}
                    title={t("MINT_TITLE")}
                  >
                    {t("MINT")}
                  </span>
                  <span className={tradePriceClass()}>
                    <span className={tradePriceClass("yes")}>{yPx}¢</span>
                    <span className="mx-1 text-[var(--t3)]">/</span>
                    <span className={tradePriceClass("no")}>{nPx}¢</span>
                  </span>
                  <span className={RECENT_TRADES_SIZE_CLASS}>
                    {formatTradePoints(size)}
                  </span>
                  <span className={RECENT_TRADES_TIME_CLASS}>
                    {timeAgo(row.yesTrade.tradedAt)}
                  </span>
                </div>
              );
            }
            const trade = row.trade;
            const sideKey = trade.side === "yes" ? "yes" : "no";
            const px =
              trade.side === "yes"
                ? trade.pricePoints
                : 100 - trade.pricePoints;
            const size = trade.quantity * px;
            return (
              <div key={trade.id} className={RECENT_TRADES_ROW_CLASS}>
                <span className={tradeSideClass(sideKey)}>
                  {t(trade.side === "yes" ? "YES" : "NO")}
                </span>
                <span className={tradePriceClass(sideKey)}>{px}¢</span>
                <span className={RECENT_TRADES_SIZE_CLASS}>
                  {formatTradePoints(size)}
                </span>
                <span className={RECENT_TRADES_TIME_CLASS}>
                  {timeAgo(trade.tradedAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
