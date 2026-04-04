import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { Risk, DIALOG } from "@idefix-backoffice/idefix/types";
import { AppDispatch, settingsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { EditRiskFormValues } from "@idefix-backoffice/idefix/forms";

interface Props {
  riskId: number;
  riskDraft: Risk;
  formikActions: FormikHelpers<EditRiskFormValues>;
}

export const editRisk =
  ({ riskId, riskDraft, formikActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.settings.updateRisk(riskId, riskDraft);
      dispatch(dialogsSlice.closeDialog(DIALOG.EDIT_RISK));
      dispatch(settingsSlice.fetchRisks({}));
    } catch (err) {
      formikActions.setFieldError("general", err.message);
      formikActions.setSubmitting(false);
    }
  };
