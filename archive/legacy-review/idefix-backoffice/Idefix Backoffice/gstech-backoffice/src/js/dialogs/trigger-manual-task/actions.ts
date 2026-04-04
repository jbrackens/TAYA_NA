import api from "../../core/api";
import { closeDialog } from "../";
import { FormikHelpers } from "formik";
import { AppDispatch } from "index";

export const triggerManualTask = (
  playerId: number,
  values: {
    fraudKey: string;
    fraudId: string;
    note: string;
    checked: boolean;
  },
  formikActions: FormikHelpers<any>,
) => async (dispatch: AppDispatch) => {
  try {
    await api.players.addManualTask(playerId, values);
    dispatch(closeDialog("trigger-manual-task"));
  } catch (error) {
    formikActions.setFieldError("general", error.message);
    formikActions.setSubmitting(false);
  }
};
