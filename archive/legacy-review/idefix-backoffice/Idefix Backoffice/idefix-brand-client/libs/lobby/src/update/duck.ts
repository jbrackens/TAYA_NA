import { Update, UpdateState } from "@brandserver-client/types";
import { ActionCreator, Reducer } from "redux";
import { createSelector } from "reselect";
import { LobbyState } from "../lobby";
import {
  ClearLeaderBoardBannerAction,
  ReceiveUpdate,
  UpdateAction,
  UpdateTypes,
  CleanScripts
} from "./types";

export const receiveUpdate: ActionCreator<ReceiveUpdate> = (
  update: Update & {
    serverExecutes?: string[];
    serverCallbacks?: string[];
    serverScripts?: string[];
  }
) => ({
  type: UpdateTypes.RECEIVE_UPDATE,
  payload: update
});

export const cleanScripts: ActionCreator<CleanScripts> = () => ({
  type: UpdateTypes.CLEAN_SCRIPTS
});

export const clearLeaderBoardBanner: ActionCreator<
  ClearLeaderBoardBannerAction
> = () => ({
  type: UpdateTypes.CLEAR_LEADER_BOARD_BANNER
});

const initialState: UpdateState = {
  details: {},
  banners: {},
  balance: {},
  notificationCount: 0,
  pendingWithdraws: 0,
  serverExecutes: [],
  serverCallbacks: [],
  serverScripts: []
};

export const updateReducer: Reducer<UpdateState, UpdateAction> = (
  state = initialState,
  action
) => {
  switch (action.type) {
    case UpdateTypes.RECEIVE_UPDATE:
      return {
        ...state,
        ...action.payload,
        serverExecutes: [
          ...state.serverExecutes,
          ...(action.payload.serverExecutes
            ? action.payload.serverExecutes
            : [])
        ],
        serverCallbacks: [
          ...state.serverCallbacks,
          ...(action.payload.serverCallbacks
            ? action.payload.serverCallbacks
            : [])
        ],
        serverScripts: [
          ...state.serverScripts,
          ...(action.payload.serverScripts ? action.payload.serverScripts : [])
        ],
        banners: {
          ...state.banners,
          ...(action.payload.banners || {})
        }
      };
    case UpdateTypes.CLEAR_LEADER_BOARD_BANNER:
      return {
        ...state,
        banners: {
          ...state.banners,
          "game-leaderboard": {
            active: false,
            banner: "",
            options: {
              show: false
            }
          }
        }
      };
    case UpdateTypes.CLEAN_SCRIPTS:
      return {
        ...state,
        serverExecutes: [],
        serverCallbacks: [],
        serverScripts: []
      };
    default:
      return state;
  }
};

export const getShopItems = (state: LobbyState) =>
  state.update.details.shopItems;

export const getNotificationCount = (state: LobbyState) =>
  state.update.notificationCount;

export const getPendingWithdrawsCount = (state: LobbyState) =>
  state.update.pendingWithdraws;

export const getBountiesCount = (state: LobbyState) =>
  state.update.details.bountiesCount;

export const getWheelCount = (state: LobbyState) =>
  state.update.details.spinCount;

export const getRewardsCount = (state: LobbyState) =>
  state.update.details.rewardsCount;

export const getBalance = (state: LobbyState) =>
  state.update.balance.CurrentTotalBalance;

export const getBadgeCount = createSelector(
  getNotificationCount,
  getPendingWithdrawsCount,
  getRewardsCount,
  getBountiesCount,
  getWheelCount,
  (
    notificationCount,
    pendingWithdraws,
    rewardsCount,
    bountiesCount,
    wheelCount
  ) =>
    notificationCount +
    pendingWithdraws +
    (rewardsCount ? rewardsCount : 0) +
    (bountiesCount ? bountiesCount : 0) +
    (wheelCount ? wheelCount : 0)
);

export const getUpdate = (state: LobbyState) => state.update;

export const selectBanners = createSelector(
  getUpdate,
  update => update.banners
);

export const selectFrontPageBanner = createSelector(
  selectBanners,
  banners => banners["frontpage"]
);
export const selectNonLoggedInBanner = createSelector(
  selectBanners,
  banners => banners["nonloggedin"]
);
