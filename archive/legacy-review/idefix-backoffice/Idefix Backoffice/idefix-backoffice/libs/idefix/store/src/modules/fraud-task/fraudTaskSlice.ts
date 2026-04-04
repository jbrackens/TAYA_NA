import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";

import { PlayerFraud } from "@idefix-backoffice/idefix/types";
import api from "@idefix-backoffice/idefix/api";
import { RootState } from "../../rootReducer";

interface FraudTaskState {
  playerFraud?: PlayerFraud;
}

const initialState: FraudTaskState = {
  playerFraud: undefined
};

export const fetchPlayerFraud = createAsyncThunk<PlayerFraud, { playerId: number; playerFraudId: number }>(
  "fraud-task/fetch",
  async ({ playerId, playerFraudId }, { rejectWithValue }) => {
    try {
      const playerFraud = await api.players.getPlayerFraud(playerId, playerFraudId);
      return playerFraud;
    } catch (error) {
      console.log(error);
      return rejectWithValue(error);
    }
  }
);

export const clearFraudPoints = createAsyncThunk<
  void,
  { playerId: number; playerFraudId: number; resolution?: string }
>("fraud-task/clear", async ({ playerId, playerFraudId, resolution }, { rejectWithValue }) => {
  try {
    await api.players.checkPlayerFraud(playerId, playerFraudId, { cleared: true, resolution });
    return;
  } catch (error) {
    console.log(error);
    return rejectWithValue(error);
  }
});

export const keepFraudPoints = createAsyncThunk<void, { playerId: number; playerFraudId: number; resolution?: string }>(
  "fraud-task/keep",
  async ({ playerId, playerFraudId, resolution }, { rejectWithValue }) => {
    try {
      await api.players.checkPlayerFraud(playerId, playerFraudId, { cleared: false, resolution });
      return;
    } catch (error) {
      console.log(error);
      return rejectWithValue(error);
    }
  }
);

const fraudTaskSlice = createSlice({
  name: "fraudTask",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchPlayerFraud.fulfilled, (state, action) => {
      state.playerFraud = action.payload;
    });
  }
});

export const { reducer, actions } = fraudTaskSlice;

const getState = (state: RootState) => state.fraudTask;

export const getFraudTask = createSelector(getState, state => state.playerFraud);
