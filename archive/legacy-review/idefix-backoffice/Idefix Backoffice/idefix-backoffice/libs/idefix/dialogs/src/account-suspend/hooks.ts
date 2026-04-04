import { useCallback, useMemo } from "react";
import { FormikHelpers } from "formik";

import { dialogsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { SuspendReason, DIALOG } from "@idefix-backoffice/idefix/types";
import { AccountSuspendFormValues } from "@idefix-backoffice/idefix/forms";

import { proceed } from "./actions";

interface Payload {
  playerId: number;
  value: boolean;
}

const useAccountSuspend = (payload: Payload) => {
  const dispatch = useAppDispatch();
  const { playerId } = payload;

  const handleSubmit = useCallback(
    (values: AccountSuspendFormValues, formikActions: FormikHelpers<AccountSuspendFormValues>) => {
      const reasons = Object.entries(values)
        .filter(([key, value]) => value && key.indexOf("flag_") === 0)
        .map(([key]) => key.substring(5)) as SuspendReason[];

      dispatch(
        proceed({
          playerId,
          reasons,
          note: values.note,
          accountClosed: values.accountClosed,
          formikActions
        })
      );
    },
    [dispatch, playerId]
  );

  const handleCloseDialog = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.ACCOUNT_SUSPEND)), [dispatch]);

  const initialValues: AccountSuspendFormValues = useMemo(
    () => ({
      flag_gambling_problem: false,
      flag_multiple: false,
      flag_fake: false,
      flag_fraudulent: false,
      flag_suspicious: false,
      flag_ipcountry: false,
      flag_data_removal: false,
      accountClosed: false,
      note: ""
    }),
    []
  );

  return { handleSubmit, handleCloseDialog, initialValues };
};

export { useAccountSuspend };
