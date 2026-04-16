"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { useAppDispatch } from "../lib/store/hooks";
import {
  setActiveBonuses,
  setWalletBreakdown,
  clearBonusState,
} from "../lib/store/bonusSlice";
import { getActiveBonuses, getWalletBreakdown } from "../lib/api/bonus-client";

/**
 * Syncs bonus state into Redux when the user is authenticated.
 * Call this once in a top-level layout component.
 * Fetches active bonuses and wallet breakdown, dispatches to bonusSlice.
 */
export function useBonusSync() {
  const { isAuthenticated, user } = useAuth();
  const dispatch = useAppDispatch();
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      if (lastUserId.current) {
        dispatch(clearBonusState());
        lastUserId.current = null;
      }
      return;
    }

    // Avoid re-fetching if user hasn't changed
    if (lastUserId.current === user.id) return;
    lastUserId.current = user.id;

    let cancelled = false;

    // Fetch active bonuses
    getActiveBonuses()
      .then((bonuses) => {
        if (!cancelled) dispatch(setActiveBonuses(bonuses));
      })
      .catch(() => {
        /* no bonus API available — that's OK */
      });

    // Fetch wallet breakdown
    getWalletBreakdown(user.id)
      .then((breakdown) => {
        if (!cancelled) dispatch(setWalletBreakdown(breakdown));
      })
      .catch(() => {
        /* no breakdown API available — that's OK */
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, dispatch]);
}
