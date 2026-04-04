import { useCallback, useMemo } from "react";
import { FormikHelpers } from "formik";

import { dialogsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { AddDocumentsFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { addDocuments } from "./actions";

type Payload = number;

const useAddDocuments = (payload: Payload) => {
  const dispatch = useAppDispatch();

  const handleSubmit = useCallback(
    (values: AddDocumentsFormValues, formikActions: FormikHelpers<AddDocumentsFormValues>) => {
      dispatch(addDocuments({ playerId: payload, values, formikActions }));
    },
    [dispatch, payload]
  );

  const handleCloseDialog = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.ADD_DOCUMENTS)), [dispatch]);

  const initialValues: AddDocumentsFormValues = useMemo(() => ({ type: "photos" }), []);

  return { handleSubmit, handleCloseDialog, initialValues };
};

export { useAddDocuments };
