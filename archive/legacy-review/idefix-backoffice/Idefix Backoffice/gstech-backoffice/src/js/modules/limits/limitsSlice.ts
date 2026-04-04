import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import { ActiveLimitOptions, LimitHistory } from "app/types";
import api from "js/core/api";
import { RootState } from "js/rootReducer";

interface LimitsState {
  isLoadingActiveLimits: boolean;
  isLoadingHistory: boolean;
  limits: ActiveLimitOptions | {};
  history: LimitHistory[];
}

const initialState: LimitsState = {
  isLoadingActiveLimits: false,
  isLoadingHistory: false,
  limits: {},
  history: [],
};

export const fetchActiveLimits = createAsyncThunk("limits/fetch-active-limits", async (playerId: number) => {
  try {
    const limits = await api.players.getActiveLimits(playerId);
    return limits;
  } catch (err) {
    console.log(err, "error");
  }
});

export const fetchHistory = createAsyncThunk("limits/fetch-history", async (playerId: number) => {
  try {
    const history = await api.players.getLimitsHistory(playerId);
    return history;
  } catch (err) {
    console.log(err, "error");
  }
});

const limitsSlice = createSlice({
  name: "limits",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchActiveLimits.pending, state => {
        state.isLoadingActiveLimits = true;
      })
      .addCase(fetchActiveLimits.fulfilled, (state, action) => {
        state.limits = action.payload!;
        state.isLoadingActiveLimits = false;
      })
      .addCase(fetchActiveLimits.rejected, state => {
        state.isLoadingActiveLimits = false;
      })

      .addCase(fetchHistory.pending, state => {
        state.isLoadingHistory = true;
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.history = action.payload!;
        state.isLoadingHistory = false;
      })
      .addCase(fetchHistory.rejected, state => {
        state.isLoadingHistory = false;
      });
  },
});

export const { reducer, actions } = limitsSlice;

export const getLimitsState = (state: RootState) => state.limits;

export const getActiveLimits = createSelector(getLimitsState, state => state.limits);
export const getActiveLimitsLoading = createSelector(getLimitsState, state => state.isLoadingActiveLimits);
export const getLimitsHistory = createSelector(getLimitsState, state => state.history);
export const getLimitsHistoryLoading = createSelector(getLimitsState, state => state.isLoadingHistory);
