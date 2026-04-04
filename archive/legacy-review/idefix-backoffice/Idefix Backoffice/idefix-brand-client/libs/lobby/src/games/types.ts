import { Game, GamesCategory } from "@brandserver-client/types";

export enum GamesTypes {
  RECEIVE_GAMES = "games/receive-games",
  SET_ACTIVE_CATEGORY = "games/set-active-category",
  SET_SEARCH_QUERY = "games/set-search-query"
}

export type GamesState = {
  games: Game[];
  activeCategory: GamesCategory["tag"];
  searchQuery: string;
};

export type GamesAction = {
  type: GamesTypes.RECEIVE_GAMES;
  payload: Game[];
};

export type CategoryAction = {
  type: GamesTypes.SET_ACTIVE_CATEGORY;
  payload: GamesCategory["tag"];
};

export type SearchQueryAction = {
  type: GamesTypes.SET_SEARCH_QUERY;
  payload: string;
};

export type GamesActions = GamesAction | CategoryAction | SearchQueryAction;
