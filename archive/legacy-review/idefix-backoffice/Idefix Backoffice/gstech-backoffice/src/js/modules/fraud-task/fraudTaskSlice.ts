import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { PlayerFraud } from "app/types";
import api from "js/core/api";

interface FraudTaskState {
  playerFraud?: PlayerFraud;
}

const initialState: FraudTaskState = {
  playerFraud: undefined,
};

export const fetchPlayerFraud = createAsyncThunk<PlayerFraud, { playerId: number; playerFraudId: number }>(
  "fraud-task/fetch",
  async ({ playerId, playerFraudId }) => {
    const playerFraud = await api.players.getPlayerFraud(playerId, playerFraudId);
    return playerFraud;
  },
);

export const clearFraudPoints = createAsyncThunk<
  void,
  { playerId: number; playerFraudId: number; resolution?: string }
>("fraud-task/clear", async ({ playerId, playerFraudId, resolution }) => {
  await api.players.checkPlayerFraud(playerId, playerFraudId, { cleared: true, resolution });
});

export const keepFraudPoints = createAsyncThunk<void, { playerId: number; playerFraudId: number; resolution?: string }>(
  "fraud-task/keep",
  async ({ playerId, playerFraudId, resolution }) => {
    await api.players.checkPlayerFraud(playerId, playerFraudId, { cleared: false, resolution });
  },
);

const fraudTaskSlice = createSlice({
  name: "fraudTask",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchPlayerFraud.fulfilled, (state, action) => {
      state.playerFraud = action.payload;
    });
  },
});

export const { reducer, actions } = fraudTaskSlice;
