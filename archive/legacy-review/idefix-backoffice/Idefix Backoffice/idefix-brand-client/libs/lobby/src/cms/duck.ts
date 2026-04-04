import { CmsPageOptions } from "@brandserver-client/types";
import { ActionCreator, Reducer } from "redux";
import { LobbyState, LobbyThunkActionCreator } from "../lobby";
import {
  CmsActions,
  CmsTypes,
  RECEIVE_CMS_PAGE_OPTIONS,
  CHANGE_LOGIN_OPEN
} from "./types";

const receiveCmsPageOptions: ActionCreator<RECEIVE_CMS_PAGE_OPTIONS> = (
  cmsPageOptions: CmsPageOptions
) => ({
  type: CmsTypes.RECEIVE_CMS_PAGE_OPTIONS,
  payload: cmsPageOptions
});

export const changeLoginOpen: ActionCreator<CHANGE_LOGIN_OPEN> = (
  login: boolean | undefined
) => ({
  type: CmsTypes.CHANGE_LOGIN_OPEN,
  payload: login
});

export const fetchCmsPageOptions: LobbyThunkActionCreator<
  any,
  LobbyState,
  CmsActions
> =
  (asPath: string) =>
  (dispatch, _, { api }) => {
    return api.cms.getPage(asPath).then(response => {
      if (response) {
        dispatch(receiveCmsPageOptions(response));
        return response;
      }
    });
  };

const initialState = {
  pageOptions: null
};

export const cmsReducer: Reducer<{
  pageOptions: CmsPageOptions | null;
}> = (state = initialState, action) => {
  switch (action.type) {
    case CmsTypes.RECEIVE_CMS_PAGE_OPTIONS:
      return {
        ...state,
        pageOptions: action.payload
      };
    case CmsTypes.CHANGE_LOGIN_OPEN:
      return {
        ...state,
        pageOptions: {
          ...state.pageOptions,
          config: state.pageOptions && {
            ...state.pageOptions.config,
            showLogin: action.payload
          }
        }
      };
    default:
      return state;
  }
};

export const getPageOptions = (state: LobbyState) => {
  return state.cms.pageOptions;
};

export const getLoginStatus = (state: LobbyState) => {
  if (
    state &&
    state.cms &&
    state.cms.pageOptions &&
    state.cms.pageOptions.config
  ) {
    return state.cms.pageOptions.config.showLogin;
  }
};
