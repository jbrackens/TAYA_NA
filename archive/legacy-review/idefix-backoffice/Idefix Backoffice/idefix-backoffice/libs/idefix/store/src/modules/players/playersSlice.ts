import { createAction, createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";

import api from "@idefix-backoffice/idefix/api";
import { debounceAction } from "@idefix-backoffice/idefix/utils";
import { PlayerWithUpdate } from "@idefix-backoffice/idefix/types";

import { RootState } from "../../rootReducer";
import { getStickyPlayerIds } from "../sidebar";

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
  isStickyPlayersFetching: 0
};

export const searchPlayers = createAsyncThunk(
  "players/load-players",
  async ({
    tab,
    query,
    taskType
  }: {
    tab: string;
    query: { text: string; brandId?: string; filters: Record<string, unknown> };
    taskType?: string;
  }) => {
    try {
      const players = await api.players.search(tab, query, taskType);
      return players;
    } catch (err) {
      console.log(err);
      return;
    }
  }
);

export const debouncedSearchPlayers = debounceAction(searchPlayers, 500);

export const fetchStickyPlayers = createAsyncThunk("players/load-sticky-players", async (playerIds: number[]) => {
  try {
    const players = await api.players.getByIds(playerIds);
    return players;
  } catch (err) {
    console.log(err, "error");
    return;
  }
});

export const addStickyPlayer = createAction("players/add-sticky-player", (playerId: number) => ({
  payload: playerId
}));
export const removeStickyPlayer = createAction("players/remove-sticky-player", (playerId: number) => ({
  payload: playerId
}));

const playersSlice = createSlice({
  name: "players",
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
  }
});

export const { reducer } = playersSlice;

export const getPlayers = (state: RootState) => state.players;
export const getPlayersList = createSelector(getPlayers, players => players.players);
export const getStickyPlayers = createSelector(getPlayers, players => players.stickyPlayers);
export const getFilteredPlayers = createSelector(
  getPlayersList,
  getStickyPlayerIds,
  (players: PlayerWithUpdate[], stickyPlayerIds: number[]) => {
    return players?.filter(player => !stickyPlayerIds?.includes(player.id));
  }
);
export const getIsFetching = createSelector(
  getPlayers,
  players => players.isPlayersFetching > 0 || players.isStickyPlayersFetching > 0
);
