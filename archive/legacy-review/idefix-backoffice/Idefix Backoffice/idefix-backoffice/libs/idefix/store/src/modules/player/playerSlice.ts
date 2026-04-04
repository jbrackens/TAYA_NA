import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";

import api from "@idefix-backoffice/idefix/api";
import { PlayerStatus, PlayerWithUpdate } from "@idefix-backoffice/idefix/types";

import { RootState } from "../../rootReducer";

interface PlayerState {
  isFetchingStatus: boolean;
  isFetchingInfo: boolean;
  status?: PlayerStatus;
  info?: PlayerWithUpdate;
}

const initialState: PlayerState = {
  isFetchingStatus: false,
  isFetchingInfo: false,
  status: undefined,
  info: undefined
};

export const getStatus = createAsyncThunk<PlayerStatus, number>(
  "player/get-status",
  async (playerId, { rejectWithValue }) => {
    try {
      const status = await api.players.getStatus(playerId);
      return status;
    } catch (err) {
      return rejectWithValue(err);
    }
  }
);

export const fetchPlayer = createAsyncThunk<PlayerWithUpdate, number>(
  "player/fetch-player",
  async (playerId, { rejectWithValue }) => {
    try {
      const player = await api.players.get(playerId);
      return player;
    } catch (err) {
      return rejectWithValue(err);
    }
  }
);

const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    handlePlayerStatusUpdate(state, action) {
      state.status = action.payload;
      state.isFetchingStatus = false;
    }
  },
  extraReducers: builder => {
    builder
      .addCase(fetchPlayer.pending, state => {
        state.isFetchingInfo = true;
      })
      .addCase(fetchPlayer.fulfilled, (state, action) => {
        state.info = action.payload;
        state.isFetchingInfo = false;
      })
      .addCase(fetchPlayer.rejected, state => {
        state.isFetchingInfo = false;
      });

    builder
      .addCase(getStatus.pending, state => {
        state.isFetchingStatus = true;
      })
      .addCase(getStatus.fulfilled, (state, action) => {
        state.status = action.payload;
        state.isFetchingStatus = false;
      })
      .addCase(getStatus.rejected, state => {
        state.isFetchingStatus = false;
      });
  }
});

export const {
  reducer,
  actions: { handlePlayerStatusUpdate }
} = playerSlice;

export const getPlayer = (state: RootState) => state.player;

export const getPlayerInfo = createSelector(getPlayer, player => player.info);
export const getIsLoadingPlayerInfo = createSelector(getPlayer, player => player.isFetchingInfo);
export const getPlayerStatus = createSelector(getPlayer, player => player.status);
export const getIsLoadingPlayerStatus = createSelector(getPlayer, player => player.isFetchingStatus);
export const getPlayerBrandId = createSelector(getPlayerInfo, playerInfo => playerInfo?.brandId);
