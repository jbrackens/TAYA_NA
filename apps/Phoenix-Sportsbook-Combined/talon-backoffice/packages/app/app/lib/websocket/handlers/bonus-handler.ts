"use client";

import type { AppDispatch } from "../../store/store";
import { WsMessage } from "../websocket-service";
import { updateBonusProgress, removeBonusById } from "../../store/bonusSlice";
import { setBalanceUpdateNeeded } from "../../store/cashierSlice";
import { invalidateBonusCaches } from "../../api/bonus-client";

/**
 * Handles WebSocket messages on the 'bonus' channel.
 * The server sends 'update' events with a `type` field in the data
 * payload to distinguish bonus lifecycle events.
 */
export const bonusHandler = (message: WsMessage, dispatch: AppDispatch) => {
  if (message.event !== "update" || !message.data) return;

  const bonusEventType = (message.data as Record<string, unknown>).type as
    | string
    | undefined;
  const bonusId = (message.data as Record<string, unknown>).bonus_id as
    | number
    | undefined;

  switch (bonusEventType) {
    case "bonus.granted":
      // New bonus activated — refresh bonus list and wallet breakdown
      invalidateBonusCaches();
      dispatch(setBalanceUpdateNeeded(true));
      break;

    case "bonus.progress": {
      const completedCents = (message.data as Record<string, unknown>)
        .completed_cents as number;
      const pct = (message.data as Record<string, unknown>).pct as number;
      if (bonusId && completedCents !== undefined) {
        dispatch(
          updateBonusProgress({
            bonusId,
            completedCents,
            progressPct: pct ?? 0,
          }),
        );
      }
      break;
    }

    case "bonus.completed":
      if (bonusId) dispatch(removeBonusById(bonusId));
      invalidateBonusCaches();
      dispatch(setBalanceUpdateNeeded(true));
      break;

    case "bonus.expired":
    case "bonus.forfeited":
      if (bonusId) dispatch(removeBonusById(bonusId));
      invalidateBonusCaches();
      dispatch(setBalanceUpdateNeeded(true));
      break;

    default:
      break;
  }
};
