import { useCallback, useMemo } from "react";
import { FormikHelpers } from "formik";

import { dialogsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { Risk, DIALOG } from "@idefix-backoffice/idefix/types";
import { EditRiskFormValues } from "@idefix-backoffice/idefix/forms";

import { editRisk } from "./actions";

const useEditRisk = (risk: Risk) => {
  const dispatch = useAppDispatch();
  const { id: riskId, active } = risk;

  const handleSubmit = useCallback(
    (values: EditRiskFormValues, formikActions: FormikHelpers<EditRiskFormValues>) => {
      const riskDraft = { ...values, active: JSON.parse(values.active) } as Risk;
      dispatch(editRisk({ riskId, riskDraft, formikActions }));
    },
    [dispatch, riskId]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.EDIT_RISK)), [dispatch]);

  const initialValues: EditRiskFormValues = useMemo(() => ({ ...risk, active: active.toString() }), [active, risk]);

  return { handleSubmit, handleClose, initialValues };
};

export { useEditRisk };
