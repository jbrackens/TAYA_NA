import { ApiError } from "@brandserver-client/api";
import { Reducer, ActionCreator } from "redux";
import { LobbyState } from "../lobby";

enum ErrorDialogTypes {
  openErrorDialog = "error-dialog/open",
  closeErrorDialog = "error-dialog/close"
}

type OpenErrorDialogAction = {
  type: ErrorDialogTypes.openErrorDialog;
  payload: { error: ApiError };
};

type CloseErrorDialogAction = {
  type: ErrorDialogTypes.closeErrorDialog;
};

type ErrorDialogActions = OpenErrorDialogAction | CloseErrorDialogAction;

const openErrorDialog: ActionCreator<OpenErrorDialogAction> = (
  error: ApiError
) => ({
  type: ErrorDialogTypes.openErrorDialog,
  payload: { error }
});

const closeErrorDialog: ActionCreator<CloseErrorDialogAction> = () => ({
  type: ErrorDialogTypes.closeErrorDialog
});

export interface ErrorDialogState {
  error?: ApiError;
}

const initialState: ErrorDialogState = {};

const errorDialogReducer: Reducer<ErrorDialogState, ErrorDialogActions> = (
  state = initialState,
  action
) => {
  switch (action.type) {
    case ErrorDialogTypes.openErrorDialog:
      return {
        ...state,
        error: action.payload.error
      };
    case ErrorDialogTypes.closeErrorDialog:
      return {
        ...state,
        error: undefined
      };
    default:
      return state;
  }
};

const getError = (state: LobbyState) => state.errorDialog.error;

export {
  ErrorDialogTypes,
  openErrorDialog,
  closeErrorDialog,
  errorDialogReducer,
  getError
};
