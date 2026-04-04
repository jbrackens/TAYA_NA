import { Update } from "@brandserver-client/types";

export enum UpdateTypes {
  RECEIVE_UPDATE = "update/receive",
  CLEAR_LEADER_BOARD_BANNER = "update/clear-leader-board-banner",
  CLEAN_SCRIPTS = "update/clean-scripts"
}

export type ReceiveUpdate = {
  type: UpdateTypes.RECEIVE_UPDATE;
  payload: Update & {
    serverExecutes?: string[];
    serverCallbacks?: string[];
    serverScripts?: string[];
  };
};

export type ClearLeaderBoardBannerAction = {
  type: UpdateTypes.CLEAR_LEADER_BOARD_BANNER;
};

export type CleanScripts = {
  type: UpdateTypes.CLEAN_SCRIPTS;
};

export type UpdateAction =
  | ReceiveUpdate
  | ClearLeaderBoardBannerAction
  | CleanScripts;
