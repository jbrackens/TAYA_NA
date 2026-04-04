import { createAction, createAsyncThunk, createSelector, createSlice, SerializedError } from "@reduxjs/toolkit";
import pick from "lodash/fp/pick";

import api from "@idefix-backoffice/idefix/api";
import { Player } from "@idefix-backoffice/idefix/types";
import { debounceAction } from "@idefix-backoffice/idefix/utils";

import { RootState } from "../../rootReducer";

interface PlayerConnectionState {
  searchQuery: string;
  players: Player[];
  selectedPlayers: number[];
  isLoading: boolean;
  error: SerializedError | null;
}

const initialState: PlayerConnectionState = {
  searchQuery: "",
  players: [],
  isLoading: false,
  selectedPlayers: [],
  error: null
};

export const playersError = createAction("risks/players-error", error => ({ payload: error }));

export const searchPlayers = createAsyncThunk(
  "player-connection/search-players",
  async (query: { text: string; brandId: string; filters: Record<string, unknown> }, { dispatch }) => {
    try {
      const players = await api.players.search("all", query);
      return players;
    } catch (err) {
      dispatch(playersError(err));
      return;
    }
  }
);

export const debouncedSearchPlayers = debounceAction(searchPlayers, 300, { leading: true, trailing: false });

const playerConnectionSlice = createSlice({
  name: "playerConnection",
  initialState,
  reducers: {
    changeSearchQuery(state, action) {
      state.searchQuery = action.payload;
    },
    changePlayerConnection(state, action) {
      state.selectedPlayers = action.payload;
    }
  },
  extraReducers: builder => {
    builder.addCase(searchPlayers.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(searchPlayers.fulfilled, (state, action) => {
      state.isLoading = false;
      state.players = action.payload!;
    });
    builder.addCase(playersError, (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    });
  }
});

export const {
  reducer,
  actions: { changeSearchQuery, changePlayerConnection }
} = playerConnectionSlice;

export const getPlayerConnection = (state: RootState) => state.playerConnection;

const getAllPlayers = createSelector(getPlayerConnection, state => state.players);

export const getSearchQuery = createSelector(getPlayerConnection, state => state.searchQuery);

export const getPlayers = createSelector(getAllPlayers, players =>
  players.map(player => ({
    ...pick(["id", "email", "brandId"], player),
    fullName: `${player.firstName} ${player.lastName}`
  }))
);

export const getSelectedPlayers = createSelector(getPlayerConnection, state => state.selectedPlayers);

export const getIsLoading = createSelector(getPlayerConnection, state => state.isLoading);

export const getError = createSelector(getPlayerConnection, state => state.error);
