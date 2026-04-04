import { Game } from "@brandserver-client/types";
import { ActionCreator, Reducer, createSelector } from "@reduxjs/toolkit";
import { LobbyState } from "../lobby";
import {
  GamesAction,
  GamesState,
  GamesTypes,
  GamesActions,
  CategoryAction,
  SearchQueryAction
} from "./types";

export const receiveGames: ActionCreator<GamesAction> = (games: Game[]) => ({
  type: GamesTypes.RECEIVE_GAMES,
  payload: games
});

export const setActiveGameCategory: ActionCreator<
  CategoryAction
> = activeCategory => ({
  type: GamesTypes.SET_ACTIVE_CATEGORY,
  payload: activeCategory
});

export const setSearchQuery: ActionCreator<
  SearchQueryAction
> = searchQuery => ({
  type: GamesTypes.SET_SEARCH_QUERY,
  payload: searchQuery
});

const initialState: GamesState = {
  games: [],
  activeCategory: "all",
  searchQuery: ""
};

export const gamesReducer: Reducer<GamesState, GamesActions> = (
  state = initialState,
  action
) => {
  switch (action.type) {
    case GamesTypes.RECEIVE_GAMES:
      return {
        ...state,
        games: action.payload
      };
    case GamesTypes.SET_ACTIVE_CATEGORY:
      return {
        ...state,
        activeCategory: action.payload
      };
    case GamesTypes.SET_SEARCH_QUERY:
      return {
        ...state,
        searchQuery: action.payload
      };
    default:
      return state;
  }
};

const getGamesState = (state: LobbyState) => state.games;

export const getGames = createSelector(
  getGamesState,
  gamesState => gamesState.games
);

export const getActiveCategory = createSelector(
  getGamesState,
  gamesState => gamesState.activeCategory
);

export const getSearchQuery = createSelector(
  getGamesState,
  gamesState => gamesState.searchQuery
);
