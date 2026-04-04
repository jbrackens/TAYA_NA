export enum LoginTypes {
  CHANGE_FORGOT_OPEN = "login/change-forgot-open",
  CHANGE_LOGIN_STATE = "login/change-login",
  CHANGE_PNP_MODAL = "login/change-pnp-modal"
}

export type ForgotOpenAction = {
  type: LoginTypes.CHANGE_FORGOT_OPEN;
  payload: boolean;
};

export type LoginOpenAction = {
  type: LoginTypes.CHANGE_LOGIN_STATE;
  payload: boolean;
};

export type ChangePnpModalAction = {
  type: LoginTypes.CHANGE_PNP_MODAL;
  payload: { isOpen: boolean; amount: string };
};

export type LoginActions =
  | ForgotOpenAction
  | LoginOpenAction
  | ChangePnpModalAction;

export type LoginState = {
  login: boolean;
  forgot: boolean;
  pnpDeposit: { isOpen: boolean; amount: string };
};
