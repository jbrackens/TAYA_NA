import { Reducer, ActionCreator } from "redux";
import { LobbyState } from "../lobby";

export enum InfoDialogTypes {
  openInfoDialog = "info-dialog/open",
  closeInfoDialog = "info-dialog/close"
}

export interface Info {
  title: string;
  message: string;
}

export interface InfoDialogState {
  info?: Info;
}

export type OpenInfoDialogAction = {
  type: InfoDialogTypes.openInfoDialog;
  payload: InfoDialogState;
};

export type CloseInfoDialogAction = {
  type: InfoDialogTypes.closeInfoDialog;
};

export type InfoDialogActions = OpenInfoDialogAction | CloseInfoDialogAction;

const openInfoDialog: ActionCreator<OpenInfoDialogAction> = (info: Info) => ({
  type: InfoDialogTypes.openInfoDialog,
  payload: { info }
});

const closeInfoDialog: ActionCreator<CloseInfoDialogAction> = () => ({
  type: InfoDialogTypes.closeInfoDialog
});

const initialState: InfoDialogState = {};

const infoDialogReducer: Reducer<InfoDialogState, InfoDialogActions> = (
  state = initialState,
  action
) => {
  switch (action.type) {
    case InfoDialogTypes.openInfoDialog:
      return {
        ...state,
        info: action.payload.info
      };
    case InfoDialogTypes.closeInfoDialog:
      return {
        ...state,
        info: undefined
      };
    default:
      return state;
  }
};

const getInfo = (state: LobbyState) => state.infoDialog.info;

export { openInfoDialog, closeInfoDialog, infoDialogReducer, getInfo };
