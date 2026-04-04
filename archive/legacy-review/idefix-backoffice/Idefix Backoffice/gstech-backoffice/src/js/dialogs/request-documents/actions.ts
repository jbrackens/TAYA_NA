import api from "../../core/api";
import { FormikHelpers } from "formik";
import { fetchPlayer } from "../../modules/player";
import { fetchAccountStatus } from "../../modules/account-status";
import { closeDialog } from "../";
import { AppDispatch } from "../../../index";
import { FormValues } from "./";
import { KycRequestDraft } from "app/types";

interface Props {
  playerId: number;
  requestData: KycRequestDraft;
  formikActions: FormikHelpers<FormValues>;
}

export const requestDocuments = ({ playerId, requestData, formikActions }: Props) => async (dispatch: AppDispatch) => {
  try {
    await api.kyc.requestDocuments(playerId, requestData);
    dispatch(fetchPlayer(playerId));
    dispatch(fetchAccountStatus(playerId));
    dispatch(closeDialog("request-documents"));
  } catch (err) {
    formikActions.setFieldError("general", "Bad request. Try later");
  } finally {
    formikActions.setSubmitting(false);
  }
};
