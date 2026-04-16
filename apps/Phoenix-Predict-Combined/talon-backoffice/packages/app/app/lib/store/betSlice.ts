'use client';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

interface Odds {
  decimal: number;
  american: string;
  fractional: string;
}

interface Bet {
  selectionId: string;
  brandMarketId: string;
  selectionName: string;
  marketName: string;
  fixtureName: string;
  fixtureId: string;
  odds: Odds;
  betId?: string;
  status?: string;
  stake?: number;
  areOddsUpdated?: boolean;
  reason?: string;
}

interface BetValues {
  [key: string]: {
    bet: number;
    toReturn: number;
  };
}

interface SummaryValues {
  totalStake: number;
  possibleReturn: number;
  betValues: BetValues;
  totalOdds: number;
  multiBetsPossibleReturn: number;
}

interface BetState {
  values: Bet[];
  summaryValues: SummaryValues;
  openBets: Bet[];
  handledOpenBetsPages: number[];
  openBetsSize: number;
  multiBetsStake: number;
  shouldScrollToErrorElement: boolean;
  errorCodes: string[];
  isErrorVisible: boolean;
  singleBets: Bet[];
  isListErrorVisible: boolean;
  isConfirmationComponentVisible: boolean;
  isOddsChangesConfirmed: boolean;
}

const initialState: BetState = {
  values: [],
  summaryValues: {
    totalStake: 0,
    possibleReturn: 0,
    betValues: {},
    totalOdds: 1,
    multiBetsPossibleReturn: 0,
  },
  openBets: [],
  handledOpenBetsPages: [],
  openBetsSize: 0,
  multiBetsStake: 0,
  shouldScrollToErrorElement: false,
  errorCodes: [],
  isErrorVisible: false,
  singleBets: [],
  isListErrorVisible: false,
  isConfirmationComponentVisible: false,
  isOddsChangesConfirmed: false,
};

const betSlice = createSlice({
  name: 'bets',
  initialState,
  reducers: {
    setBets: (state, action: PayloadAction<Bet[]>) => {
      state.values = action.payload;
    },
    toggleBetElement: (state, action: PayloadAction<Bet>) => {
      const existingIndex = state.values.findIndex(
        (bet) =>
          bet.selectionId === action.payload.selectionId &&
          bet.brandMarketId === action.payload.brandMarketId
      );

      if (existingIndex >= 0) {
        state.values = state.values.filter((_, index) => index !== existingIndex);
      } else {
        state.values.push(action.payload);
      }
    },
    updateBetElementOdds: (
      state,
      action: PayloadAction<{ selectionId: string; brandMarketId: string; odds: Odds }>
    ) => {
      const bet = state.values.find(
        (b) =>
          b.selectionId === action.payload.selectionId &&
          b.brandMarketId === action.payload.brandMarketId
      );
      if (bet) {
        bet.odds = action.payload.odds;
        bet.areOddsUpdated = true;
      }
    },
    clearBets: (state) => {
      state.values = [];
    },
    clearOpenBets: (state) => {
      state.openBets = [];
      state.handledOpenBetsPages = [];
    },
    removeBet: (state, action: PayloadAction<{ selectionId: string; brandMarketId: string }>) => {
      state.values = state.values.filter(
        (bet) =>
          !(
            bet.selectionId === action.payload.selectionId &&
            bet.brandMarketId === action.payload.brandMarketId
          )
      );
    },
    setSummaryValues: (state, action: PayloadAction<SummaryValues>) => {
      state.summaryValues = action.payload;
    },
    updateSummaryValuesAfterOddsUpdate: (state, action: PayloadAction<SummaryValues>) => {
      state.summaryValues = action.payload;
    },
    clearSummaryValues: (state) => {
      state.summaryValues = {
        totalStake: 0,
        possibleReturn: 0,
        betValues: {},
        totalOdds: 1,
        multiBetsPossibleReturn: 0,
      };
    },
    resetBetslipState: (state) => {
      state.values = [];
      state.summaryValues = {
        totalStake: 0,
        possibleReturn: 0,
        betValues: {},
        totalOdds: 1,
        multiBetsPossibleReturn: 0,
      };
      state.shouldScrollToErrorElement = false;
      state.errorCodes = [];
      state.isErrorVisible = false;
      state.isConfirmationComponentVisible = false;
      state.isOddsChangesConfirmed = false;
    },
    setBetValues: (state, action: PayloadAction<BetValues>) => {
      state.summaryValues.betValues = action.payload;
    },
    setOpenBets: (state, action: PayloadAction<Bet[]>) => {
      state.openBets = action.payload;
    },
    setOpenBetsSize: (state, action: PayloadAction<number>) => {
      state.openBetsSize = action.payload;
    },
    setHandledOpenBetsPages: (state, action: PayloadAction<number[]>) => {
      state.handledOpenBetsPages = action.payload;
    },
    setMultiBetsStake: (state, action: PayloadAction<number>) => {
      state.multiBetsStake = action.payload;
    },
    setTotalOddsValue: (state, action: PayloadAction<number>) => {
      state.summaryValues.totalOdds = action.payload;
    },
    wsBetUpdateOpened: (state, action: PayloadAction<Bet>) => {
      const index = state.openBets.findIndex((bet) => bet.betId === action.payload.betId);
      if (index >= 0) {
        state.openBets[index] = { ...state.openBets[index], status: 'opened' };
      } else {
        state.openBets.push({ ...action.payload, status: 'opened' });
      }
    },
    wsBetUpdateCancelled: (state, action: PayloadAction<{ betId: string }>) => {
      state.openBets = state.openBets.map((bet) =>
        bet.betId === action.payload.betId ? { ...bet, status: 'cancelled' } : bet
      );
    },
    wsBetUpdateSettled: (state, action: PayloadAction<Bet>) => {
      const index = state.openBets.findIndex((bet) => bet.betId === action.payload.betId);
      if (index >= 0) {
        state.openBets[index] = { ...state.openBets[index], status: 'settled' };
      }
    },
    wsBetUpdateFailed: (state, action: PayloadAction<{ betId: string; reason: string }>) => {
      const index = state.openBets.findIndex((bet) => bet.betId === action.payload.betId);
      if (index >= 0) {
        state.openBets[index] = { ...state.openBets[index], status: 'failed', reason: action.payload.reason };
      }
    },
    setShouldScrollToErrorElement: (state, action: PayloadAction<boolean>) => {
      state.shouldScrollToErrorElement = action.payload;
    },
    setErrorCodes: (state, action: PayloadAction<string[]>) => {
      state.errorCodes = action.payload;
    },
    setIsErrorVisible: (state, action: PayloadAction<boolean>) => {
      state.isErrorVisible = action.payload;
    },
    setSingleBets: (state, action: PayloadAction<Bet[]>) => {
      state.singleBets = action.payload;
    },
    setIsListErrorVisible: (state, action: PayloadAction<boolean>) => {
      state.isListErrorVisible = action.payload;
    },
    setIsConfirmationComponentVisible: (state, action: PayloadAction<boolean>) => {
      state.isConfirmationComponentVisible = action.payload;
    },
    setIsOddsChangesConfirmed: (state, action: PayloadAction<boolean>) => {
      state.isOddsChangesConfirmed = action.payload;
    },
  },
});

export const {
  setBets,
  toggleBetElement,
  updateBetElementOdds,
  clearBets,
  clearOpenBets,
  removeBet,
  setSummaryValues,
  updateSummaryValuesAfterOddsUpdate,
  clearSummaryValues,
  resetBetslipState,
  setBetValues,
  setOpenBets,
  setOpenBetsSize,
  setHandledOpenBetsPages,
  setMultiBetsStake,
  setTotalOddsValue,
  wsBetUpdateOpened,
  wsBetUpdateCancelled,
  wsBetUpdateSettled,
  wsBetUpdateFailed,
  setShouldScrollToErrorElement,
  setErrorCodes,
  setIsErrorVisible,
  setSingleBets,
  setIsListErrorVisible,
  setIsConfirmationComponentVisible,
  setIsOddsChangesConfirmed,
} = betSlice.actions;

// Selectors
export const selectBets = (state: RootState) => state.bets.values;
export const selectSummaryValues = (state: RootState) => state.bets.summaryValues;
export const selectBetValues = (state: RootState) => state.bets.summaryValues.betValues;
export const selectOpenBets = (state: RootState) => state.bets.openBets;
export const selectHandledOpenBetsPages = (state: RootState) => state.bets.handledOpenBetsPages;
export const selectOpenBetsSize = (state: RootState) => state.bets.openBetsSize;
export const selectMultiBetsStake = (state: RootState) => state.bets.multiBetsStake;
export const selectShouldScrollToErrorElement = (state: RootState) => state.bets.shouldScrollToErrorElement;
export const selectBetslipErrorCodes = (state: RootState) => state.bets.errorCodes;
export const selectIsBetslipErrorVisible = (state: RootState) => state.bets.isErrorVisible;
export const selectSingleBets = (state: RootState) => state.bets.singleBets;
export const selectIsListErrorVisble = (state: RootState) => state.bets.isListErrorVisible;
export const selectIsConfirmationComponentVisible = (state: RootState) => state.bets.isConfirmationComponentVisible;
export const selectIsOddsChangesConfirmed = (state: RootState) => state.bets.isOddsChangesConfirmed;

export default betSlice.reducer;
