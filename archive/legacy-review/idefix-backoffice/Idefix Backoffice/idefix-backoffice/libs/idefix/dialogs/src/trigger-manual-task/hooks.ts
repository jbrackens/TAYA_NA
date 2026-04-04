import { FormikHelpers } from "formik";
import { useCallback, useMemo, useEffect } from "react";

import { useAppDispatch, dialogsSlice, settingsSlice, useAppSelector } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { triggerManualTask } from "./actions";

const useTriggerManualTask = (playerId: number) => {
  const dispatch = useAppDispatch();
  const risks = useAppSelector(settingsSlice.getRisks);

  useEffect(() => {
    dispatch(settingsSlice.fetchRisks({ params: { manualTrigger: true } }));
  }, [dispatch]);

  const handleSubmit = useCallback(
    (values: any, formikActions: FormikHelpers<any>) => {
      dispatch(triggerManualTask(playerId, values, formikActions));
    },
    [dispatch, playerId]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.TRIGGER_MANUAL_TASK)), [dispatch]);

  const initialValues = useMemo(
    () => ({
      fraudKey: "",
      checked: false
    }),
    []
  );

  return { handleSubmit, handleClose, initialValues, risks };
};

export { useTriggerManualTask };
