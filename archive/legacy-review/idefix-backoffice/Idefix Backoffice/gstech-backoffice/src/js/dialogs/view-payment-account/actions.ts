import api from "../../core/api";
import { closeDialog } from "../";
import { fetchPaymentAccounts } from "../../modules/payments";
import omit from "lodash/fp/omit";
import pick from "lodash/fp/pick";
import isEmpty from "lodash/fp/isEmpty";
import { AccountActive, AccountDocument, PaymentAccountDraft } from "app/types";
import { AppDispatch } from "../../../index";
import { FormikHelpers } from "formik";
import { FormValues } from "./index";

const mapDocument = (document: AccountDocument) =>
  ({
    ...omit(["formStatus"], document),
    content: document.content,
  } as Partial<PaymentAccountDraft>);

interface Props {
  playerId: number;
  accountId: number;
  accountDraft: FormValues & { documentsForRemove: AccountDocument[] };
  formikActions: FormikHelpers<FormValues>;
}

export const updateAccount = ({ playerId, accountId, accountDraft, formikActions }: Props) => async (
  dispatch: AppDispatch,
) => {
  const accountData = {
    ...pick(["account", "kycChecked"], accountDraft),
    parameters: isEmpty(accountDraft.parameters) ? undefined : accountDraft.parameters,
  } as Partial<AccountActive>;

  const updateAccountPromise = api.players.updateAccount(playerId, accountId, accountData);

  const updateDocumentsPromise = Promise.all(
    accountDraft?.documents?.map(documentDraft => {
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
            },
          );
        default:
          return Promise.resolve({});
      }
    }) || [],
  );

  const removedDocumentsPromise = accountDraft.documentsForRemove.map(documentDraft =>
    api.players.removeAccountDocument(playerId, accountId, documentDraft.id),
  );

  try {
    await Promise.all([updateAccountPromise, updateDocumentsPromise, removedDocumentsPromise]);
    dispatch(fetchPaymentAccounts(playerId));
    dispatch(closeDialog("view-payment-account"));
  } catch (error) {
    formikActions.setFieldError("general", error.message);
  }
};
