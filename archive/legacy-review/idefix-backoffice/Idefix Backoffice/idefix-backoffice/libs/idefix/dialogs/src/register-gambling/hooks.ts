import { useCallback, useMemo } from "react";
import { FormikHelpers } from "formik";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { GamblingProblemData, DIALOG } from "@idefix-backoffice/idefix/types";

import { registerGamblingProblem } from "./actions";

const useRegisterGambling = () => {
  const dispatch = useAppDispatch();

  const handleSubmit = useCallback(
    (values: GamblingProblemData["player"], formikActions: FormikHelpers<GamblingProblemData["player"]>) => {
      const draft = {
        player: values
      };
      dispatch(registerGamblingProblem(draft, formikActions));
    },
    [dispatch]
  );

  const handleClose = useCallback(
    () => dispatch(dialogsSlice.closeDialog(DIALOG.REGISTER_GAMBLING_PROBLEM)),
    [dispatch]
  );

  const initialValues = useMemo(
    () => ({
      firstName: "",
      lastName: "",
      email: "",
      countryId: ""
    }),
    []
  );

  return { handleSubmit, handleClose, initialValues };
};

export { useRegisterGambling };
