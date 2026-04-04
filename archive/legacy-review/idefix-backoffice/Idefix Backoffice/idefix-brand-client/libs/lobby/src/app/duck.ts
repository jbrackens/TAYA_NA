import { AppData } from "@brandserver-client/types";
import { ActionCreator, Reducer } from "redux";
import { createSelector } from "reselect";
import { GamesAction, receiveGames } from "../games";
import { LobbyState, LobbyThunkActionCreator } from "../lobby";
import {
  AppAction,
  AppTypes,
  RECEIVE_INIT_DATA,
  SUBMIT_QUESTIONNAIRE
} from "./types";
import { getPageOptions } from "../cms";

const receiveInitData: ActionCreator<RECEIVE_INIT_DATA> = (
  initData: AppData
) => ({
  type: AppTypes.RECEIVE_INIT_DATA,
  payload: initData
});

const submitQuestionnaireSuccess: ActionCreator<SUBMIT_QUESTIONNAIRE> = (
  requiredQuestionnaores: string[]
) => ({
  type: AppTypes.SUBMIT_QUESTIONNAIRE,
  payload: requiredQuestionnaores
});

export const fetchInitData: LobbyThunkActionCreator<
  any,
  LobbyState,
  AppAction | GamesAction
> =
  () =>
  (dispatch, _, { api }) => {
    return api.games
      .getGames()
      .then(response => {
        if (response) {
          const { update, games, ...initData } = response;

          dispatch(receiveGames(games));
          dispatch(receiveInitData(initData));
        }
      })
      .catch(err => console.log("Failed to get games: ", err.toString()));
  };

export const fetchFreeGames: LobbyThunkActionCreator<
  any,
  LobbyState,
  AppAction | GamesAction
> =
  (lang: string) =>
  (dispatch, _, { api }) => {
    return api.games
      .getFreeGames(lang)
      .then(response => {
        if (response) {
          const { update, games, ...initData } = response;
          dispatch(receiveGames(games));
          dispatch(receiveInitData(initData));
        }
      })
      .catch(err => console.log("Failed to get free games: ", err.toString()));
  };

export const submitQuestionnaire: LobbyThunkActionCreator<
  any,
  LobbyState,
  AppAction
> =
  (id: string, data) =>
  (dispatch, _, { api }) => {
    return api.questionnaires.submitQuestionnaire(id, data).then(response => {
      const { requiredQuestionnaires, ok } = response;
      if (ok === true) {
        return dispatch(submitQuestionnaireSuccess(requiredQuestionnaires));
      }

      return response;
    });
  };

const initialState: AppData = {
  config: {},
  player: {
    FirstName: "",
    CountryISO: "",
    CurrencyISO: "EUR",
    currencySymbol: "€",
    username: "",
    email: "",
    languageISO: ""
  },
  requestTc: false,
  requiredQuestionnaires: [],
  mobile: false,
  flags: [],
  classes: [],
  search: {
    recommendations: []
  },
  jurisdiction: "MGA",
  categories: [],
  formData: {
    countries: [],
    currencies: [],
    phoneRegions: [],
    country: null,
    languages: []
  }
};

const appReducer: Reducer<AppData, AppAction> = (
  state = initialState,
  action
) => {
  switch (action.type) {
    case AppTypes.RECEIVE_INIT_DATA:
      return {
        ...state,
        ...action.payload
      };
    case AppTypes.SUBMIT_QUESTIONNAIRE:
      return {
        ...state,
        requiredQuestionnaires: action.payload
      };
    default:
      return state;
  }
};

export const getApp = (state: LobbyState) => state.app;
const getConfig = (state: LobbyState) => state.app.config;

export const selectAppFormData = createSelector(getApp, app => app.formData);

const getLoggedinLiveChatConfig = createSelector(
  [getConfig],
  config => config.liveagent
);

const getNonLoggedinLiveChatConfig = createSelector(
  [getPageOptions],
  pageOptions => {
    if (pageOptions && pageOptions.config && pageOptions.config.liveagent) {
      return pageOptions.config.liveagent;
    }

    return undefined;
  }
);

export const getLiveAgentConfig = createSelector(
  [getLoggedinLiveChatConfig, getNonLoggedinLiveChatConfig],
  (loggedinConfig, nonLoggedinConfig) => {
    if (loggedinConfig) {
      return loggedinConfig;
    }

    return nonLoggedinConfig;
  }
);

export const getTermsConditionStatus = (state: LobbyState) =>
  state.app.requestTc;

export const getQuestionnaires = (state: LobbyState) =>
  state.app.requiredQuestionnaires;

export const selectLoggedInMobile = (state: LobbyState) => state.app.mobile;
export const getPlayer = (state: LobbyState) => state.app.player;
export const getSearchRecommendations = (state: LobbyState) =>
  state.app.search.recommendations;
export const getJurisdiction = (state: LobbyState) => state.app.jurisdiction;

export const selectPaymentIq = (state: LobbyState) =>
  state.app.config.paymentiq;

export const getCategories = (state: LobbyState) => state.app.categories;

export const getMobile = createSelector(
  [getPageOptions, selectLoggedInMobile],
  (pageOptions, isMobile) => {
    if (pageOptions) {
      return pageOptions.mobile;
    }

    return isMobile;
  }
);

export const selectSupportedLanguages = createSelector(
  selectAppFormData,
  formData => formData.languages
);

export default appReducer;
