"use client";

/**
 * InspectorPanel — the redesign's persistent contextual inspector (Figma:
 * 05 Redesign › InspectorV2, Gates 2/3 approved). Focused market: price
 * readout + split bar, resolution rules + source, liquidity line, MY
 * exposure, and the REAL ticket (ConnectedTradeTicket — live preview/place
 * path with hold-to-place). Idle: a my-book digest. The ticket has exactly
 * one desktop container: this one.
 */

import { useTranslation } from "react-i18next";
import type { PredictionMarket } from "@taptrade-ui/api-client/src/prediction-types";
import { formatCompactPoints } from "../../lib/points";
import { ConnectedTradeTicket } from "../prediction/ConnectedTradeTicket";
import type { RowPosition } from "./RowMarketV2";

function sourceLabel(key: string | undefined): string {
  if (!key) return "Manual";
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const EYEBROW_CLASS =
  "font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--t3)]";

export function InspectorPanel({
  market,
  position,
  openPositions,
  onMarketUpdate,
}: {
  market: PredictionMarket | null;
  position?: RowPosition;
  openPositions: number;
  onMarketUpdate: (market: PredictionMarket) => void;
}) {
  const { t } = useTranslation("prediction");

  if (!market) {
    return (
      <div className="flex flex-col gap-3 rounded-[8px] border border-[var(--border-1)] bg-[var(--surface-1)] p-4">
        <span className={EYEBROW_CLASS}>
          {t("FLOOR_INSPECTOR", "Inspector")}
        </span>
        <p className="m-0 text-[13px] leading-[1.5] text-[var(--t2)]">
          {t(
            "FLOOR_INSPECTOR_IDLE",
            "Select a market to evaluate and trade without leaving the board.",
          )}
        </p>
        <span className="font-mono text-[11px] font-semibold text-[var(--t2)] tabular-nums">
          {t("FLOOR_OPEN_POSITIONS", "Open positions")}: {openPositions}
        </span>
      </div>
    );
  }

  const yes = Math.max(0, Math.min(100, market.yesPricePoints));

  return (
    <div className="flex flex-col gap-3.5 rounded-[8px] border border-[var(--border-1)] bg-[var(--surface-1)] p-4">
      <span className={EYEBROW_CLASS}>
        {t("FLOOR_INSPECTOR", "Inspector")}
        {market.eventTitle ? ` — ${market.eventTitle}` : ""}
      </span>
      <h2 className="m-0 text-[15px] font-semibold leading-[1.35] text-[var(--t1)]">
        {market.title}
      </h2>

      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[28px] font-semibold leading-none tracking-[-0.02em] text-[var(--t1)] tabular-nums">
          {market.yesPricePoints}¢
        </span>
        <span className="flex flex-col items-end gap-0.5 font-mono text-[11px] font-semibold tabular-nums">
          <span className="text-[var(--yes-text)]">
            {t("YES")} {market.yesPricePoints}¢
          </span>
          <span className="text-[var(--no-text)]">
            {t("NO")} {market.noPricePoints}¢
          </span>
        </span>
      </div>
      <span
        className="flex h-[5px] w-full gap-[2px]"
        role="img"
        aria-label={`${yes}%`}
      >
        <span
          className="h-full rounded-[var(--r-pill)] bg-[var(--yes-bar)]"
          style={{ width: `${yes}%` }}
        />
        <span className="h-full min-w-0 flex-1 rounded-[var(--r-pill)] bg-[var(--no-bar)]" />
      </span>

      {position && (
        <div className="flex items-baseline justify-between gap-2 rounded-[5px] bg-[var(--accent-soft)] px-2.5 py-1.5">
          <span className={EYEBROW_CLASS}>
            {t("FLOOR_MY_EXPOSURE", "My exposure")}
          </span>
          <span className="font-mono text-[10.5px] font-semibold text-[var(--accent-text)] tabular-nums">
            {position.quantity} {position.side === "yes" ? t("YES") : t("NO")}{" "}
            @ {position.avgPricePoints}¢
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className={EYEBROW_CLASS}>
          {t("FLOOR_RESOLUTION", "Resolution")} ·{" "}
          {t("SETTLEMENT_SOURCE", {
            source: sourceLabel(market.settlementSourceKey),
          })}
        </span>
        <p className="m-0 line-clamp-3 text-[11.5px] leading-[1.5] text-[var(--t2)]">
          {market.settlementRule?.trim() ||
            market.description?.trim() ||
            t("FLOOR_RULES_FALLBACK", "Resolves under the published market rules.")}
        </p>
      </div>

      <div className="flex items-baseline gap-2">
        <span className={EYEBROW_CLASS}>{t("LIQUIDITY")}</span>
        <span className="font-mono text-[11px] font-semibold text-[var(--t2)] tabular-nums">
          {formatCompactPoints(market.liquidityPoints)}
        </span>
      </div>

      <div className="border-t border-[var(--border-1)] pt-3">
        <ConnectedTradeTicket
          key={market.id}
          market={market}
          defaultAmount={100}
          onMarketUpdate={onMarketUpdate}
        />
      </div>
    </div>
  );
}
