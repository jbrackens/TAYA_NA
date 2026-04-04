import { useCallback, useMemo } from "react";
import { FormikHelpers } from "formik";

import { dialogsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { AccountStatusFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { accountStatus } from "./actions";

interface Payload {
  title: string;
  callback: (reason: string) => void;
}

const useAccountStatus = (payload: Payload) => {
  const dispatch = useAppDispatch();

  const handleSubmit = useCallback(
    ({ reason }: { reason: string }, formActions: FormikHelpers<AccountStatusFormValues>) => {
      dispatch(accountStatus({ payload, reason, formActions }));
    },
    [dispatch, payload]
  );

  const handleCloseDialog = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.ACCOUNT_STATUS)), [dispatch]);

  const initialValues: AccountStatusFormValues = useMemo(
    () => ({
      reason: ""
    }),
    []
  );

  return { handleSubmit, handleCloseDialog, initialValues };
};

export { useAccountStatus };
