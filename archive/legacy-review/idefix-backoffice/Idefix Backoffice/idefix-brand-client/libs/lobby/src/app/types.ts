import { AppData } from "@brandserver-client/types";

export enum AppTypes {
  RECEIVE_INIT_DATA = "app/receive-init-data",
  SUBMIT_QUESTIONNAIRE = "app/submit-questionnaire"
}

export type AppAction = RECEIVE_INIT_DATA | SUBMIT_QUESTIONNAIRE;

export type RECEIVE_INIT_DATA = {
  type: AppTypes.RECEIVE_INIT_DATA;
  payload: AppData;
};

export type SUBMIT_QUESTIONNAIRE = {
  type: AppTypes.SUBMIT_QUESTIONNAIRE;
  payload: string[];
};
