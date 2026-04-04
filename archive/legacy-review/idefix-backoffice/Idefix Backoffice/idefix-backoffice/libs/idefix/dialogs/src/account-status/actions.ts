import { FormikHelpers } from "formik";

import { AppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { AccountStatusFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  payload: {
    callback: (reason: string) => void;
  };
  reason: string;
  formActions: FormikHelpers<AccountStatusFormValues>;
}

export const accountStatus =
  ({ payload, reason, formActions }: Props) =>
  async (dispatch: AppDispatch) => {
    const { callback } = payload;

    try {
      await callback(reason);
      dispatch(dialogsSlice.closeDialog(DIALOG.ACCOUNT_STATUS));
    } catch (error) {
      formActions.setFieldError("general", error.message);
    }
  };
