import { RealityCheck } from "@brandserver-client/types";

export interface DialogsType {
  realityCheck: {
    isOpen: boolean;
    popupFrequency: number;
    statistics: {
      AmountWin?: string;
      AmountLose?: string;
      PlayTimeMinutes: number;
    };
  };
  termsConditions: {
    termsConditions: string;
    privacyPolicy: string;
    bonusTerms: string;
  };
}

export enum DialogsTypes {
  FETCH_REALITY_CHECK = "modal-dialog/fetch-reality-check",
  ACCEPT_REALITY_CHECK = "modal-dialog/accept-reality-check",
  FETCH_TERMS_CONDITIONS_CONTENT = "modal-dialog/fetch-terms-conditions-content"
}

export type DialogsAction =
  | ReceiveRealityCheck
  | HandleRealityCheck
  | FetchTermsConditionsContent;

export type ReceiveRealityCheck = {
  type: DialogsTypes.FETCH_REALITY_CHECK;
  payload: RealityCheck;
};

export type HandleRealityCheck = {
  type: DialogsTypes.ACCEPT_REALITY_CHECK;
  payload: boolean;
};

export type FetchTermsConditionsContent = {
  type: DialogsTypes.FETCH_TERMS_CONDITIONS_CONTENT;
  payload: {
    termsConditions: string;
    privacyPolicy: string;
    bonusTerms: string;
  };
};
