import api from "../../core/api";
import { FormikHelpers } from "formik";
import { RiskDraft } from "app/types";
import { refetchRisks } from "../../modules/settings";
import { closeDialog } from "../";
import { FormValues } from "./";
import { AppDispatch } from "../../../index";

export const addRisk = (riskDraft: RiskDraft, formikActions: FormikHelpers<FormValues>) => async (
  dispatch: AppDispatch,
) => {
  try {
    await api.settings.addRisk(riskDraft);
    dispatch(closeDialog("add-risk"));
    dispatch(refetchRisks({}));
  } catch (err) {
    formikActions.setFieldError("general", err.message);
    formikActions.setSubmitting(false);
  }
};
