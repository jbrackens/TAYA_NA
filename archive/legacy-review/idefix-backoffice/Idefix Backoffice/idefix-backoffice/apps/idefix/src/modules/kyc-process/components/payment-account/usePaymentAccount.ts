import { useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { FormikHelpers, FormikProps } from "formik";
import find from "lodash/fp/find";
import isEmpty from "lodash/fp/isEmpty";

import { dialogsSlice, kycProcessSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { AccountActive, DIALOG, Kyc, PlayerAccount } from "@idefix-backoffice/idefix/types";
import { KycProcessPaymentFormValues } from "@idefix-backoffice/idefix/forms";
import { addPaymentAccount, updatePaymentAccount } from "@idefix-backoffice/idefix/dialogs";
import { mapDocuments } from "../../utils";

const initialPaymentAccount = {
  method: "BankTransfer",
  account: "",
  kycChecked: false,
  parameters: { bic: "" }
};

interface Params {
  kycFormikProps: FormikProps<Kyc>;
  document: Kyc;
  accounts: PlayerAccount[];
}

export const usePaymentAccount = ({ kycFormikProps, document, accounts }: Params) => {
  const dispatch = useAppDispatch();
  const params = useParams<{ playerId: string; kycDocumentId: string }>();
  const playerId = Number(params.playerId);
  const documentId = Number(params.kycDocumentId);

  const account =
    kycFormikProps.values.accountId &&
    accounts &&
    find((acc: AccountActive) => acc.id === kycFormikProps.values.accountId)(accounts);
  const defaultDocuments = useMemo(
    () => (account && account.documents && mapDocuments(account.documents)) || [],
    [account]
  );
  const defaultAccount = accounts && document && find((acc: AccountActive) => acc.id === document.accountId)(accounts);
  const isPaymentType = kycFormikProps.values.documentType === "payment_method";

  const handlePaymentAccountSubmit = useCallback(
    async (values: KycProcessPaymentFormValues, formikHelpers: FormikHelpers<KycProcessPaymentFormValues>) => {
      const { parameters, documents, ...rest } = values;
      const newExpiryDate = documents[0].expiryDate;

      const accountDraft = {
        ...rest,
        parameters: parameters && !isEmpty(parameters.bic) ? parameters : undefined,
        documents: documents.slice(1, documents.length + 1),
        documentsForRemove: []
      } as KycProcessPaymentFormValues;

      const makeDocumentDraft = (accountId: number) => ({
        type: kycFormikProps.values.documentType,
        fields: kycFormikProps.values.fields!,
        kycChecked: document.kycChecked,
        expiryDate: newExpiryDate,
        accountId
      });

      if (kycFormikProps.values.accountId !== "new") {
        const account = find((acc: AccountActive) => acc.id === kycFormikProps.values.accountId)(accounts);

        account?.id &&
          dispatch(
            updatePaymentAccount({ playerId, accountId: account.id, accountDraft, formikActions: formikHelpers })
          );
        dispatch(
          kycProcessSlice.submitDocument({
            playerId,
            kycDocumentId: documentId,
            document: makeDocumentDraft(account!.id),
            formikActions: formikHelpers
          })
        );
        return;
      }

      const newAccountId = await dispatch(
        addPaymentAccount({ playerId, values: accountDraft, formikActions: formikHelpers })
      );

      if (newAccountId) {
        dispatch(
          kycProcessSlice.submitDocument({
            playerId,
            kycDocumentId: documentId,
            document: makeDocumentDraft(newAccountId),
            formikActions: formikHelpers
          })
        );
      }
    },
    [
      accounts,
      dispatch,
      document.kycChecked,
      documentId,
      kycFormikProps.values.accountId,
      kycFormikProps.values.documentType,
      kycFormikProps.values.fields,
      playerId
    ]
  );

  const handleDecline = useCallback(() => {
    dispatch(dialogsSlice.openDialog(DIALOG.CONFIRM_DECLINE_KYC, { playerId, documentId }));
  }, [dispatch, documentId, playerId]);

  const initialValues = useMemo(
    () =>
      ({
        ...(account || initialPaymentAccount),
        documents: defaultAccount ? [...defaultDocuments] : [document, ...defaultDocuments]
      } as KycProcessPaymentFormValues),
    [account, defaultAccount, defaultDocuments, document]
  );

  useEffect(() => {
    if (kycFormikProps.values.documentType === null) {
      return;
    }
    if (!isPaymentType) {
      kycFormikProps.setErrors({});
    }
  }, [isPaymentType, kycFormikProps]);

  return { account, isPaymentType, initialValues, handlePaymentAccountSubmit, handleDecline };
};
