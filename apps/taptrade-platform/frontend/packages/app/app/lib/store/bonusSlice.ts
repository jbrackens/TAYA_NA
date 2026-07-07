"use client";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";

interface WalletBreakdown {
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  unit: string;
}

interface ActiveBonus {
  bonusId: number;
  campaignName: string;
  bonusType: string;
  status: string;
  unit: string;
  grantedPoints: number;
  remainingPoints: number;
  playRequiredPoints: number;
  playCompletedPoints: number;
  playProgressPct: number;
  expiresAt: string;
  grantedAt: string;
}

interface BonusState {
  activeBonuses: ActiveBonus[];
  walletBreakdown: WalletBreakdown | null;
  lastFetchedAt: number | null;
}

const initialState: BonusState = {
  activeBonuses: [],
  walletBreakdown: null,
  lastFetchedAt: null,
};

const bonusSlice = createSlice({
  name: "bonus",
  initialState,
  reducers: {
    setActiveBonuses: (state, action: PayloadAction<ActiveBonus[]>) => {
      state.activeBonuses = action.payload;
      state.lastFetchedAt = Date.now();
    },
    setWalletBreakdown: (state, action: PayloadAction<WalletBreakdown>) => {
      state.walletBreakdown = action.payload;
    },
    updateBonusProgress: (
      state,
      action: PayloadAction<{
        bonusId: number;
        completedPoints: number;
        progressPct: number;
      }>,
    ) => {
      const bonus = state.activeBonuses.find(
        (b) => b.bonusId === action.payload.bonusId,
      );
      if (bonus) {
        bonus.playCompletedPoints = action.payload.completedPoints;
        bonus.playProgressPct = action.payload.progressPct;
      }
    },
    removeBonusById: (state, action: PayloadAction<number>) => {
      state.activeBonuses = state.activeBonuses.filter(
        (b) => b.bonusId !== action.payload,
      );
    },
    clearBonusState: (state) => {
      state.activeBonuses = [];
      state.walletBreakdown = null;
      state.lastFetchedAt = null;
    },
  },
});

export const {
  setActiveBonuses,
  setWalletBreakdown,
  updateBonusProgress,
  removeBonusById,
  clearBonusState,
} = bonusSlice.actions;

// Selectors
export const selectActiveBonuses = (state: RootState) =>
  state.bonus.activeBonuses;
export const selectWalletBreakdown = (state: RootState) =>
  state.bonus.walletBreakdown;
export const selectHasActiveBonuses = (state: RootState) =>
  state.bonus.activeBonuses.length > 0;
export const selectBonusLastFetched = (state: RootState) =>
  state.bonus.lastFetchedAt;

export default bonusSlice.reducer;
