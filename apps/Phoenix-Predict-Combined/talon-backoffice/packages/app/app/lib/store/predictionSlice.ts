'use client';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

export interface PredictionSelection {
  marketId: string;
  outcomeId: string;
}

interface PredictionState {
  selection: PredictionSelection | null;
  stakeUsd: string;
  /** Most-recently-visited prediction market IDs (max 6) */
  recentMarketIds: string[];
}

const initialState: PredictionState = {
  selection: null,
  stakeUsd: '25',
  recentMarketIds: [],
};

const predictionSlice = createSlice({
  name: 'prediction',
  initialState,
  reducers: {
    selectPredictionOutcome: (state, action: PayloadAction<PredictionSelection>) => {
      state.selection = action.payload;
    },
    clearPredictionSelection: (state) => {
      state.selection = null;
    },
    setPredictionStake: (state, action: PayloadAction<string>) => {
      state.stakeUsd = action.payload;
    },
    markPredictionMarketVisited: (state, action: PayloadAction<string>) => {
      const marketId = `${action.payload || ''}`.trim();
      if (!marketId) return;
      state.recentMarketIds = [
        marketId,
        ...state.recentMarketIds.filter((item) => item !== marketId),
      ].slice(0, 6);
    },
  },
});

// Selectors
export const selectPredictionSelection = (state: RootState) => state.prediction.selection;
export const selectPredictionStake = (state: RootState) => state.prediction.stakeUsd;
export const selectPredictionRecentMarketIds = (state: RootState) => state.prediction.recentMarketIds;

export const {
  selectPredictionOutcome,
  clearPredictionSelection,
  setPredictionStake,
  markPredictionMarketVisited,
} = predictionSlice.actions;

export default predictionSlice.reducer;
