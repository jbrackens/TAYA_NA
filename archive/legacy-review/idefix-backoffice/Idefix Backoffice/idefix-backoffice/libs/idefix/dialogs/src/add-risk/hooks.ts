import { FormikHelpers } from "formik";
import { useCallback, useMemo } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { RiskDraft, DIALOG } from "@idefix-backoffice/idefix/types";
import { RiskFormValues } from "@idefix-backoffice/idefix/forms";

import { addRisk } from "./actions";

const useAddRisk = () => {
  const dispatch = useAppDispatch();

  const handleSubmit = useCallback(
    (values: RiskFormValues, formikActions: FormikHelpers<RiskFormValues>) => {
      const riskDraft = { ...values, active: JSON.parse(values.active as string) } as RiskDraft;
      dispatch(addRisk(riskDraft, formikActions));
    },
    [dispatch]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.ADD_RISK)), [dispatch]);

  const initialValues: RiskFormValues = useMemo(
    () => ({
      type: "",
      fraudKey: "",
      points: 0,
      maxCumulativePoints: 0,
      requiredRole: "",
      active: "false",
      name: "",
      title: "",
      description: "",
      manualTrigger: true
    }),
    []
  );

  return { handleSubmit, handleClose, initialValues };
};

export { useAddRisk };
