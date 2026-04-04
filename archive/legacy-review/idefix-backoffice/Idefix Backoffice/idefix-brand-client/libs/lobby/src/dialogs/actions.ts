import { RealityCheck } from "@brandserver-client/types";
import { ActionCreator, Dispatch } from "redux";

import { DialogsAction, DialogsTypes, ReceiveRealityCheck } from "./types";

import { LobbyState, LobbyThunkActionCreator } from "../lobby";

// action creators

// #REALITY_CHECK
const receiveRealityCheck: ActionCreator<ReceiveRealityCheck> = (
  data: RealityCheck
) => ({
  type: DialogsTypes.FETCH_REALITY_CHECK,
  payload: data
});

export const fetchRealityCheck: LobbyThunkActionCreator<
  any,
  LobbyState,
  DialogsAction
> =
  () =>
  (dispatch: Dispatch, _, { api }) =>
    api.realityCheck.getStatistics().then((data: RealityCheck) => {
      dispatch(receiveRealityCheck(data));
      return data;
    });

export const acceptRealityCheck: ActionCreator<DialogsAction> = (
  status: boolean
) => ({
  type: DialogsTypes.ACCEPT_REALITY_CHECK,
  payload: status
});

// #Terms & Conditions

const receiveTermsConditionsContent: ActionCreator<DialogsAction> = ([
  terms,
  policy,
  bonus
]) => ({
  type: DialogsTypes.FETCH_TERMS_CONDITIONS_CONTENT,
  payload: {
    termsConditions: terms.content,
    privacyPolicy: policy.content,
    bonusTerms: bonus.content
  }
});

export const fetchTermsConditionsContent: LobbyThunkActionCreator<
  any,
  LobbyState,
  DialogsAction
> =
  () =>
  (dispatch: Dispatch, _, { api: { termsConditions } }) =>
    Promise.all([
      termsConditions.getTermsConditions(),
      termsConditions.getPrivacyPolicy(),
      termsConditions.getBonusTerms()
    ]).then(results => dispatch(receiveTermsConditionsContent(results)));
