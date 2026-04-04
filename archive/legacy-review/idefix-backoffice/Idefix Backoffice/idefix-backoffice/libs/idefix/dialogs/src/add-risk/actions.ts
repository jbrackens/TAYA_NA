import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { RiskDraft, DIALOG } from "@idefix-backoffice/idefix/types";
import { AppDispatch, dialogsSlice, settingsSlice } from "@idefix-backoffice/idefix/store";
import { RiskFormValues } from "@idefix-backoffice/idefix/forms";

export const addRisk =
  (riskDraft: RiskDraft, formikActions: FormikHelpers<RiskFormValues>) => async (dispatch: AppDispatch) => {
    try {
      await api.settings.addRisk(riskDraft);
      dispatch(dialogsSlice.closeDialog(DIALOG.ADD_RISK));
      dispatch(settingsSlice.fetchRisks({}));
    } catch (err) {
      formikActions.setFieldError("general", err.message);
      formikActions.setSubmitting(false);
    }
  };
