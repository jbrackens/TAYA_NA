import { FormikHelpers } from "formik";
import { useEffect, useCallback, useMemo } from "react";
import pickBy from "lodash/fp/pickBy";
import keys from "lodash/fp/keys";
import isNil from "lodash/fp/isNil";
import omitBy from "lodash/fp/omitBy";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { KycRequestDraft, DIALOG } from "@idefix-backoffice/idefix/types";
import { RequestDocumentsFormValues } from "@idefix-backoffice/idefix/forms";

import { fetchAccounts } from "../add-transaction/actions";
import { requestDocuments } from "./actions";

const useRequestDocuments = (playerId: number) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchAccounts(playerId));
  }, [dispatch, playerId]);

  const handleSubmit = useCallback(
    (values: RequestDocumentsFormValues, formikActions: FormikHelpers<RequestDocumentsFormValues>) => {
      const { requestAutomatically, note, message, payment_method, verification, ...rest } = values;

      const documentTypes = keys(pickBy(value => value === true, rest)).map(type => ({ type }));

      let documents = [...documentTypes];

      if (verification) {
        const paymentMethods = payment_method?.map(accountId => ({ type: "payment_method", accountId })) || [];
        documents = [...documents, ...paymentMethods];
      }

      const draft = omitBy(isNil, { requestAutomatically, note, message, documents }) as unknown as KycRequestDraft;

      dispatch(requestDocuments({ playerId, requestData: draft, formikActions }));
    },
    [playerId, dispatch]
  );

  const handleCloseDialog = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.REQUEST_DOCUMENTS)), [dispatch]);

  const initialValues: RequestDocumentsFormValues = useMemo(
    () => ({
      requestAutomatically: true,
      identification: false,
      utility_bill: false,
      verification: false,
      source_of_wealth: false
    }),
    []
  );

  return { handleSubmit, handleCloseDialog, initialValues };
};

export { useRequestDocuments };
