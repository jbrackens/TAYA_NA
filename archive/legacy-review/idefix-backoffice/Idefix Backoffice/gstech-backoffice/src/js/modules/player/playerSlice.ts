import api from "js/core/api";
import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import { PlayerStatus, PlayerWithUpdate } from "app/types";
import { RootState } from "js/rootReducer";

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
  info: undefined,
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
  },
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
  },
);

const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    handlePlayerStatusUpdate(state, action) {
      state.status = action.payload;
      state.isFetchingStatus = false;
    },
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
      .addCase(getStatus.rejected, state => {
        state.isFetchingStatus = false;
      });
  },
});

export const {
  reducer,
  actions: { handlePlayerStatusUpdate },
} = playerSlice;

export const getPlayer = (state: RootState) => state.player;

export const getPlayerInfo = createSelector(getPlayer, player => player.info);

export const getPlayerBrandId = createSelector(getPlayerInfo, playerInfo => playerInfo?.brandId);
