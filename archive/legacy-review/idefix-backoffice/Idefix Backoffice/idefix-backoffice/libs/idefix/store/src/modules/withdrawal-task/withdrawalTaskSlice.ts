import { createSlice, createAsyncThunk, PayloadAction, createSelector } from "@reduxjs/toolkit";

import { PlayerEvent, WithdrawalEvent, WithdrawalWithOptions } from "@idefix-backoffice/idefix/types";
import api from "@idefix-backoffice/idefix/api";

import { RootState } from "../../rootReducer";

export interface Values {
  paymentProviderId: number | null;
  amount: string;
  staticId: number | null;
}

export interface WithdrawalTaskState {
  isFetchingWithdrawals: boolean;
  withdrawal: WithdrawalWithOptions | null;
  isFetchingNotes: boolean;
  notes: PlayerEvent[];
  isFetchingEvents: boolean;
  events: WithdrawalEvent[];
  values: Values;
  error?: any;
}

export const initialState: WithdrawalTaskState = {
  isFetchingWithdrawals: false,
  withdrawal: null,
  isFetchingNotes: false,
  notes: [],
  isFetchingEvents: false,
  events: [],
  values: {
    paymentProviderId: null,
    amount: "",
    staticId: null
  }
};

export const fetchWithdrawal = createAsyncThunk<WithdrawalWithOptions, string>(
  "withdrawal-task/fetch-withdrawal",
  async (withdrawalId, { rejectWithValue }) => {
    try {
      return await api.players.getWithdrawal(withdrawalId);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const fetchNotes = createAsyncThunk<PlayerEvent[], number>(
  "withdrawal-task/fetch-notes",
  async (playerId, { rejectWithValue }) => {
    try {
      return await api.players.getNotes(playerId);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

export const fetchEvents = createAsyncThunk<WithdrawalEvent[], string>(
  "withdrawal-task/fetch-events",
  async (withdrawalId, { rejectWithValue }) => {
    try {
      return await api.players.getWithdrawalEvents(withdrawalId);
    } catch (e) {
      return rejectWithValue(e);
    }
  }
);

const withdrawalTaskSlice = createSlice({
  name: "withdrawal-task",
  initialState,
  reducers: {
    changeValue(state, action: PayloadAction<{ key: string; value: string }>) {
      const { payload } = action;
      state.values = { ...state.values, [payload.key]: payload.value };
    }
  },
  extraReducers: builder => {
    builder.addCase(fetchWithdrawal.pending, state => {
      state.isFetchingWithdrawals = true;
    });
    builder.addCase(fetchWithdrawal.fulfilled, (state, action) => {
      const { payload } = action;
      state.isFetchingWithdrawals = false;
      state.withdrawal = payload;
      state.values = {
        paymentProviderId: payload.paymentProviders.length > 0 ? payload.paymentProviders[0].id : null,
        amount: String(payload.amount / 100),
        staticId: payload?.paymentParameters?.staticId ? payload.paymentParameters.staticId : null
      };
    });

    builder.addCase(fetchNotes.pending, state => {
      state.isFetchingNotes = true;
    });
    builder.addCase(fetchNotes.fulfilled, (state, action) => {
      const { payload } = action;
      state.isFetchingNotes = false;
      state.notes = payload;
    });

    builder.addCase(fetchEvents.pending, state => {
      state.isFetchingEvents = true;
    });
    builder.addCase(fetchEvents.fulfilled, (state, action) => {
      const { payload } = action;
      state.isFetchingEvents = false;
      state.events = payload;
    });
  }
});

export const {
  reducer,
  actions: { changeValue }
} = withdrawalTaskSlice;

const getState = (state: RootState) => state.withdrawalTask;

export const getWithdrawal = createSelector(getState, state => state.withdrawal);
export const getIsLoadingWithdrawal = createSelector(getState, state => state.isFetchingWithdrawals);
export const getNotes = createSelector(getState, state => state.notes);
export const getIsLoadingNotes = createSelector(getState, state => state.isFetchingNotes);
export const getEvents = createSelector(getState, state => state.events);
export const getIsLoadingEvents = createSelector(getState, state => state.isFetchingEvents);
export const getValues = createSelector(getState, state => state.values);
