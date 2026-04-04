import { FormikHelpers } from "formik";
import { useCallback, useMemo } from "react";

import { dialogsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { PaymentAccountFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { addPaymentAccount } from "./actions";

const useAddPaymentAccount = (playerId: number) => {
  const dispatch = useAppDispatch();

  const handleSubmit = useCallback(
    (values: PaymentAccountFormValues, formikActions: FormikHelpers<PaymentAccountFormValues>) => {
      dispatch(addPaymentAccount({ playerId, values, formikActions }));
    },
    [dispatch, playerId]
  );

  const handleCloseDialog = useCallback(
    () => dispatch(dialogsSlice.closeDialog(DIALOG.ADD_PAYMENT_ACCOUNT)),
    [dispatch]
  );

  const initialValues: PaymentAccountFormValues = useMemo(
    () => ({
      method: "BankTransfer",
      account: "",
      kycChecked: false,
      parameters: { bic: "" }
    }),
    []
  );

  return { handleSubmit, handleCloseDialog, initialValues };
};

export { useAddPaymentAccount };
