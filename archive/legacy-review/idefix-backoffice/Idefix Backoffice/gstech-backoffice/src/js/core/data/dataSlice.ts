import { createAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { PlayerWithUpdate } from "app/types";
import api from "../api";
import { debounceAction } from "../helpers";

interface CoreDataState {
  players: PlayerWithUpdate[];
  stickyPlayers: PlayerWithUpdate[];
  isPlayersFetching: number;
  isStickyPlayersFetching: number;
}

const initialState: CoreDataState = {
  players: [],
  stickyPlayers: [],
  isPlayersFetching: 0,
  isStickyPlayersFetching: 0,
};

export const searchPlayers = createAsyncThunk(
  "core-data/load-players",
  async ({
    tab,
    query,
    taskType,
  }: {
    tab: string;
    query: { text: string; brandId: string; filters: {} };
    taskType?: string;
  }) => {
    try {
      const players = await api.players.search(tab, query, taskType);
      return players;
    } catch (err) {
      console.log(err);
    }
  },
);

export const debouncedSearchPlayers = debounceAction(searchPlayers, 500);

export const fetchStickyPlayers = createAsyncThunk("core-data/load-sticky-players", async (playerIds: number[]) => {
  try {
    const players = await api.players.getByIds(playerIds);
    return players;
  } catch (err) {
    console.log(err, "error");
  }
});

export const addStickyPlayer = createAction("core-data/add-sticky-player", (playerId: number) => ({
  payload: playerId,
}));
export const removeStickyPlayer = createAction("core-data/remove-sticky-player", (playerId: number) => ({
  payload: playerId,
}));

const dataSlice = createSlice({
  name: "coreData",
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(searchPlayers.pending, state => {
        state.isPlayersFetching = state.isPlayersFetching + 1;
      })
      .addCase(searchPlayers.fulfilled, (state, action) => {
        state.players = action.payload!;
        state.isPlayersFetching = state.isPlayersFetching - 1;
      });
    builder
      .addCase(fetchStickyPlayers.pending, state => {
        state.isStickyPlayersFetching = state.isStickyPlayersFetching + 1;
      })
      .addCase(fetchStickyPlayers.fulfilled, (state, action) => {
        state.stickyPlayers = action.payload!;
        state.isStickyPlayersFetching = state.isStickyPlayersFetching - 1;
      })
      .addCase(addStickyPlayer, (state, action) => {
        const newStickyPlayer = state.players.find(player => player.id === action.payload);
        state.stickyPlayers = newStickyPlayer ? [...state.stickyPlayers, newStickyPlayer] : state.stickyPlayers;
      })
      .addCase(removeStickyPlayer, (state, action) => {
        const newStickyPlayers = state.stickyPlayers.filter(stickyPlayer => stickyPlayer.id !== action.payload);
        state.stickyPlayers = newStickyPlayers;
      });
  },
});

export const { reducer } = dataSlice;
