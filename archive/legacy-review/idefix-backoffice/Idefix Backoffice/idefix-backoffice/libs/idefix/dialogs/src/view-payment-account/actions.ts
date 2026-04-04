import { FormikHelpers } from "formik";
import omit from "lodash/fp/omit";
import pick from "lodash/fp/pick";
import isEmpty from "lodash/fp/isEmpty";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, paymentsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { AccountActive, AccountDocument, PaymentAccountDraft, DIALOG } from "@idefix-backoffice/idefix/types";
import { KycProcessPaymentFormValues, PaymentAccountFormValues } from "@idefix-backoffice/idefix/forms";

const mapDocument = (document: AccountDocument) =>
  ({
    ...omit(["formStatus"], document),
    content: document.content
  } as Partial<PaymentAccountDraft>);

interface Props {
  playerId: number;
  accountId: number;
  accountDraft: any;
  formikActions: FormikHelpers<PaymentAccountFormValues> | FormikHelpers<KycProcessPaymentFormValues>;
}

export const updateAccount =
  ({ playerId, accountId, accountDraft, formikActions }: Props) =>
  async (dispatch: AppDispatch) => {
    const accountData = {
      ...pick(["account", "kycChecked"], accountDraft),
      parameters: isEmpty(accountDraft.parameters) ? undefined : accountDraft.parameters
    } as Partial<AccountActive>;

    const updateAccountPromise = api.players.updateAccount(playerId, accountId, accountData);

    const updateDocumentsPromise = Promise.all(
      accountDraft?.documents?.map((documentDraft: any) => {
        switch (documentDraft.formStatus) {
          case "new":
            return api.players.addAccountDocument(playerId, accountId, mapDocument(documentDraft));
          case "updated":
            return api.players.updateAccountDocument(
              playerId,
              accountId,
              documentDraft.id,
              pick(["content", "expiryDate"], mapDocument(documentDraft)) as {
                content: string;
                expiryDate: string;
              }
            );
          default:
            return Promise.resolve({});
        }
      }) || []
    );

    const removedDocumentsPromise = accountDraft.documentsForRemove.map((documentDraft: any) =>
      api.players.removeAccountDocument(playerId, accountId, documentDraft.id)
    );

    try {
      await Promise.all([updateAccountPromise, updateDocumentsPromise, removedDocumentsPromise]);
      dispatch(paymentsSlice.fetchPaymentAccounts(playerId));
      dispatch(dialogsSlice.closeDialog(DIALOG.VIEW_PAYMENT_ACCOUNT));
    } catch (error) {
      formikActions.setFieldError("general", error.message);
    }
  };
