import { Reducer, ActionCreator, createSelector } from "@reduxjs/toolkit";
import { LobbyState } from "../lobby";

import {
  LoginActions,
  LoginTypes,
  LoginState,
  ForgotOpenAction,
  LoginOpenAction,
  ChangePnpModalAction
} from "./types";

export const changeForgotOpen: ActionCreator<ForgotOpenAction> = (
  forgot: boolean
) => ({
  type: LoginTypes.CHANGE_FORGOT_OPEN,
  payload: forgot
});

export const changeLoginState: ActionCreator<LoginOpenAction> = (
  isOpen: boolean
) => ({
  type: LoginTypes.CHANGE_LOGIN_STATE,
  payload: isOpen
});

export const changePnpModalAction: ActionCreator<ChangePnpModalAction> = ({
  isOpen,
  amount
}: {
  isOpen: boolean;
  amount: string;
}) => ({
  type: LoginTypes.CHANGE_PNP_MODAL,
  payload: { isOpen, amount }
});

const initialState = {
  login: false,
  forgot: false,
  pnpDeposit: { isOpen: false, amount: "" }
};

export const loginReducer: Reducer<LoginState, LoginActions> = (
  state = initialState,
  action
) => {
  switch (action.type) {
    case LoginTypes.CHANGE_FORGOT_OPEN:
      return {
        ...state,
        forgot: action.payload
      };
    case LoginTypes.CHANGE_LOGIN_STATE:
      return {
        ...state,
        login: action.payload
      };
    case LoginTypes.CHANGE_PNP_MODAL:
      return {
        ...state,
        pnpDeposit: action.payload
      };
    default:
      return state;
  }
};

const selectLoginState = (state: LobbyState) => state.login;

export const selectIsForgotOpen = createSelector(
  selectLoginState,
  login => login.forgot
);

export const selectIsLoginOpen = createSelector(
  selectLoginState,
  loginState => loginState.login
);

export const selectIsPnpOpen = createSelector(
  selectLoginState,
  loginState => loginState.pnpDeposit
);
