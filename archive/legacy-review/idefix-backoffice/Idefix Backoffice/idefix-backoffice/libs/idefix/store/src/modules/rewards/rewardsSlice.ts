import { createAction, createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";

import api from "@idefix-backoffice/idefix/api";
import { RewardInitialGroups, RewardProgress } from "@idefix-backoffice/idefix/types";

import { RootState } from "../../rootReducer";
import { getPlayerBrandId } from "../player";

interface RewardsState {
  isLedgersLoading: boolean;
  ledgers: any[];
  isProgressesLoading: boolean;
  progresses: RewardProgress[];
  isBalanceLoading: boolean;
  balance: null | object;
  isInitGroupsLoading: boolean;
  initGroups: RewardInitialGroups | null;
  error: string | null;
}

const initialState: RewardsState = {
  isLedgersLoading: false,
  ledgers: [],
  isProgressesLoading: false,
  progresses: [],
  isBalanceLoading: false,
  balance: null,
  isInitGroupsLoading: false,
  initGroups: null,
  error: null
};

export const fetchPlayerLedgersError = createAction("rewards/fetch-ledgers-error", error => ({ payload: { error } }));

export const fetchPlayerLedgers = createAsyncThunk<
  any,
  { playerId: number; params?: { group: string; brandId: string; pageSize?: number; pageIndex?: number } }
>("rewards/fetch-ledgers", async ({ playerId, params = {} }, { dispatch, rejectWithValue }) => {
  const { pageSize = 999999, ...rest } = params;
  try {
    const response = await api.players.getLedgers(playerId, { pageIndex: 1, pageSize, ...rest });
    // @ts-ignore
    return response.data; // TODO update type for ledgers
  } catch (err) {
    const error = err.message;
    dispatch(fetchPlayerLedgersError(error));
    return rejectWithValue(err);
  }
});

export const fetchInitGroups = createAsyncThunk("rewards/fetch-init-groups", async (_, { rejectWithValue }) => {
  try {
    const response = await api.players.getInitGroups();
    return { initGroups: response.data };
  } catch (err) {
    console.log(err.message);
    return rejectWithValue(err);
  }
});

export const markAsUsed = createAsyncThunk<void, { playerId: number; ledgerId: number }>(
  "rewards/mark-as-used",
  async ({ playerId, ledgerId }, { dispatch }) => {
    try {
      await api.players.markRewardUsed(playerId, ledgerId);
      dispatch(fetchPlayerLedgers({ playerId }));
    } catch (err) {
      dispatch(fetchPlayerLedgersError(err.message));
    }
  }
);

export const fetchPlayerProgresses = createAsyncThunk<any, { playerId: number; brandId: string }>(
  "rewards/fetch-progresses",
  async ({ playerId, brandId }, { rejectWithValue }) => {
    try {
      const response = await api.players.getProgresses(brandId, playerId);
      return { progresses: response.data.progresses };
    } catch (error) {
      console.log(error, "error");
      return rejectWithValue(error);
    }
  }
);

export const fetchPlayerBalance = createAsyncThunk<any, { playerId: number; brandId: string }>(
  "rewards/fetch-player-balance",
  async ({ playerId, brandId }, { rejectWithValue }) => {
    try {
      const response = await api.players.getBalances(brandId, playerId);
      return { balance: response.data };
    } catch (err) {
      console.log(err);
      return rejectWithValue(err);
    }
  }
);

const rewardsSlice = createSlice({
  name: "rewards",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchPlayerLedgers.pending, state => {
        state.isLedgersLoading = true;
      })
      .addCase(fetchPlayerLedgers.fulfilled, (state, action) => {
        if (action.payload) {
          state.ledgers = action.payload.ledgers;
        }
        state.isLedgersLoading = false;
      })
      .addCase(fetchPlayerLedgersError, (state, action) => {
        state.error = action.payload.error;
        state.isLedgersLoading = false;
      });
    builder
      .addCase(fetchInitGroups.pending, state => {
        state.isInitGroupsLoading = true;
      })
      .addCase(fetchInitGroups.fulfilled, (state, action) => {
        state.initGroups = action.payload!.initGroups;
        state.isInitGroupsLoading = false;
      });
    builder
      .addCase(fetchPlayerProgresses.pending, state => {
        state.isProgressesLoading = true;
      })
      .addCase(fetchPlayerProgresses.fulfilled, (state, action) => {
        state.progresses = action.payload.progresses;
        state.isProgressesLoading = false;
      })
      .addCase(fetchPlayerProgresses.rejected, state => {
        state.isProgressesLoading = false;
      });
    builder
      .addCase(fetchPlayerBalance.pending, state => {
        state.isBalanceLoading = true;
      })
      .addCase(fetchPlayerBalance.fulfilled, (state, action) => {
        state.balance = action.payload.balance;
        state.isBalanceLoading = false;
      })
      .addCase(fetchPlayerBalance.rejected, state => {
        state.isBalanceLoading = false;
      });
  }
});

export const { reducer } = rewardsSlice;

export const getRewardsState = (state: RootState) => state.playerRewards;

export const getLedgers = createSelector(getRewardsState, state => state.ledgers);
export const getIsLedgersLoading = createSelector(getRewardsState, state => state.isLedgersLoading);

export const getProgresses = createSelector(getRewardsState, state => state.progresses);
export const getIsProgressesLoading = createSelector(getRewardsState, state => state.isProgressesLoading);

export const getBalance = createSelector(getRewardsState, state => state.balance);
export const getIsBalanceLoading = createSelector(getRewardsState, state => state.isBalanceLoading);

export const getInitGroups = createSelector(
  getRewardsState,
  getPlayerBrandId,
  (state: RootState["playerRewards"], brandId?: string) => state.initGroups && brandId && state.initGroups[brandId]
);
export const getIsInitGroupsLoading = createSelector(getRewardsState, state => state.isInitGroupsLoading);

export const getError = createSelector(getRewardsState, state => state.error);
