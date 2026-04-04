import api from "../../core/api";
import { closeDialog } from "../";
import { AppDispatch } from "../../../index";
import { FormikHelpers } from "formik";
import { changePlayerTab } from "../../modules/sidebar";

export const declineKyc = (playerId: number, documentId: number, formikHelpers: FormikHelpers<any>) => async (
  dispatch: AppDispatch,
) => {
  try {
    await api.kyc.decline(playerId, documentId);
    dispatch(closeDialog("confirm-decline-kyc"));
    dispatch(changePlayerTab(playerId, "player-info"));
  } catch (error) {
    formikHelpers.setFieldError("general", error.message);
  }
};
