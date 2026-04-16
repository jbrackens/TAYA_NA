import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type PredictionSelection = {
  marketId: string;
  outcomeId: string;
};

type State = {
  selection: PredictionSelection | null;
  stakeUsd: string;
  recentMarketIds: string[];
};

const initialState: State = {
  selection: null,
  stakeUsd: "25",
  recentMarketIds: [],
};

const predictionSlice = createSlice({
  name: "prediction",
  initialState,
  reducers: {
    selectPredictionOutcome: (
      state,
      action: PayloadAction<PredictionSelection>,
    ) => {
      state.selection = action.payload;
    },
    clearPredictionSelection: (state) => {
      state.selection = null;
    },
    setPredictionStake: (state, action: PayloadAction<string>) => {
      state.stakeUsd = action.payload;
    },
    markPredictionMarketVisited: (state, action: PayloadAction<string>) => {
      const marketId = `${action.payload || ""}`.trim();
      if (!marketId) {
        return;
      }
      state.recentMarketIds = [
        marketId,
        ...state.recentMarketIds.filter((item) => item !== marketId),
      ].slice(0, 6);
    },
  },
});

export type SliceState = {
  prediction: State;
};

export const selectPredictionSelection = (state: SliceState) =>
  state.prediction.selection;
export const selectPredictionStake = (state: SliceState) =>
  state.prediction.stakeUsd;
export const selectPredictionRecentMarketIds = (state: SliceState) =>
  state.prediction.recentMarketIds;

export const {
  selectPredictionOutcome,
  clearPredictionSelection,
  setPredictionStake,
  markPredictionMarketVisited,
} = predictionSlice.actions;

export default predictionSlice.reducer;
