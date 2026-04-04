import { useCallback, useMemo, useState } from "react";
import { FormikHelpers } from "formik";

import { dialogsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { AccountDocument, PlayerAccount, DIALOG } from "@idefix-backoffice/idefix/types";
import { PaymentAccountFormValues } from "@idefix-backoffice/idefix/forms";

import { updateAccount } from "./actions";

interface Payload {
  playerId: number;
  account: PlayerAccount;
  parameters?: {
    bic: string;
    accountType?: string;
    bankCode?: string;
    bankBranch?: string;
  };
  kycChecked: boolean;
  documents: unknown;
}

const useViewPaymentAccount = (payload: Payload) => {
  const dispatch = useAppDispatch();
  const [documentsForRemove, setDocumentsForRemove] = useState<AccountDocument[]>([]);
  const { method, account, parameters, kycChecked, documents = [] } = (payload && payload.account) || {};

  const handleSubmit = useCallback(
    (accountDraft: PaymentAccountFormValues, formikActions: FormikHelpers<PaymentAccountFormValues>) => {
      const { playerId, account } = payload;

      dispatch(
        updateAccount({
          playerId,
          accountId: account.id,
          accountDraft: { ...accountDraft, documentsForRemove },
          formikActions
        })
      );
    },
    [dispatch, documentsForRemove, payload]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.VIEW_PAYMENT_ACCOUNT)), [dispatch]);

  const initialValues: PaymentAccountFormValues = useMemo(
    () =>
      ({
        method,
        account,
        parameters,
        kycChecked,
        documents: documents.map(({ id, photoId, name, content, expiryDate }) => ({
          id,
          photoId,
          name,
          content,
          expiryDate: expiryDate && new Date(expiryDate)
        }))
      } as unknown as PaymentAccountFormValues),
    [account, documents, kycChecked, method, parameters]
  );

  return { handleSubmit, handleClose, initialValues, setDocumentsForRemove };
};

export { useViewPaymentAccount };
