import { LobbyState, LobbyThunkActionCreator } from "../lobby";
import { StartGameOptions } from "@brandserver-client/types";
import { pushRoute } from "@brandserver-client/utils";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import Router from "next/router";

/*
 * State
 * */

export interface GameState {
  startGameOptions?: StartGameOptions;
  showBalance: boolean;
  error?: Error;
}

const initialState: GameState = {
  startGameOptions: undefined,
  showBalance: true,
  error: undefined
};

/*
 * Slice
 * */

const {
  reducer,
  actions: { startGameSuccess, startGameFailure, endGameSuccess }
} = createSlice({
  name: "game",
  initialState,
  reducers: {
    startGameSuccess: (
      state,
      { payload: startGameOptions }: PayloadAction<StartGameOptions>
    ) => ({
      ...state,
      startGameOptions,
      showBalance: false
    }),

    startGameFailure: (state, { payload: error }: PayloadAction<Error>) => ({
      ...state,
      error
    }),

    endGameSuccess: () => initialState
  }
});

/*
 * Thunks
 * */

const startGame: LobbyThunkActionCreator<any, LobbyState, any> =
  (gameId: string, isFreeGame: boolean) =>
  (dispatch, _, { api }) => {
    const startGameApi = !isFreeGame
      ? api.game.startGame
      : api.game.startFreeGame;

    startGameApi(gameId)
      .then(({ startGameOptions }) => {
        if (startGameOptions.ok === false) {
          throw new Error(startGameOptions.result);
        }

        const { GameURL, ForceFullscreen } = startGameOptions;

        if (ForceFullscreen) {
          return window.location.replace(GameURL);
        }

        dispatch(startGameSuccess(startGameOptions));
      })
      .catch(error => {
        dispatch(startGameFailure(error));
      });
  };

const endGame: LobbyThunkActionCreator<Promise<any> | void, LobbyState, any> =
  (isFreeGame: boolean) =>
  (dispatch, _getState, { api }) => {
    if (isFreeGame) {
      dispatch(endGameSuccess());
      return;
    }

    if (
      window &&
      window.brandserver &&
      window.brandserver.addRealityCheckListener
    ) {
      window.brandserver.addRealityCheckListener(null);
    }

    return api.balance.getBalance().then<unknown>(({ update, depleted }) => {
      dispatch(endGameSuccess());

      if (depleted && update.pendingWithdraws > 0) {
        pushRoute("/loggedin/myaccount/withdraw-pending");
      }

      if (
        Router.asPath &&
        !Router.asPath.includes("/loggedin/myaccount") &&
        depleted
      ) {
        pushRoute("/loggedin/myaccount/deposit");
      }
      return;
    });
  };

/*
 * Selectors
 * */

const getGameState = (state: LobbyState) => state.game;
const getShowBalance = (state: LobbyState) => state.game.showBalance;

/*
 * Exports
 * */

export { reducer as game, startGame, endGame, getGameState, getShowBalance };
