import api from "../../core/api";
import { FormikHelpers } from "formik";
import { Risk } from "app/types";
import { refetchRisks } from "../../modules/settings";
import { closeDialog } from "../";
import { AppDispatch } from "../../../index";
import { FormValues } from "./";

interface Props {
  riskId: number;
  riskDraft: Risk;
  formikActions: FormikHelpers<FormValues>;
}

export const editRisk = ({ riskId, riskDraft, formikActions }: Props) => async (dispatch: AppDispatch) => {
  try {
    await api.settings.updateRisk(riskId, riskDraft);
    dispatch(closeDialog("edit-risk"));
    dispatch(refetchRisks({}));
  } catch (err) {
    formikActions.setFieldError("general", err.message);
    formikActions.setSubmitting(false);
  }
};
