import React, { useCallback, useEffect, useMemo } from "react";
import { Formik, FormikHelpers, FormikProps } from "formik";
import find from "lodash/fp/find";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import { KycProcessForm } from "../../forms/kyc-process";
import { PaymentAccountForm, validate as validatePaymentAccount } from "../../forms/payment-account";
import { AccountStatusContainer } from "../account-status";
import { PlayerDetailsContainer } from "../player-details";
import { AccountActive, DocumentType, Kyc, PlayerAccount } from "app/types";
import Divider from "@material-ui/core/Divider";

const mapDocuments = (documents: Kyc[]) =>
  documents.map(({ id, photoId, name, content, expiryDate, fields }) => ({
    id,
    photoId,
    name,
    content,
    expiryDate: expiryDate && new Date(expiryDate),
    fields,
  }));

const initialPaymentAccount = {
  method: "BankTransfer",
  account: "",
  kycChecked: false,
  parameters: { bic: "" },
};

interface Props {
  kycProps: FormikProps<Kyc>;
  accounts: PlayerAccount[];
  document: Kyc;
  playerId: number;
  onEditImage: (prevPhotoId: string, newImage: any, documentId: number) => void;
  onSubmit: any;
  onDecline: () => void;
}

export interface FormValues {
  documents: (
    | Kyc
    | {
        id: number;
        photoId: string | null;
        name: string;
        content: string | null;
        expiryDate: "" | Date;
        fields: {} | null;
      }
  )[];
  id: number;
  active: boolean;
  withdrawals: boolean;
  kycChecked: boolean;
  account: string;
  accountHolder: string;
  parameters: { bic?: string; accountType?: string; bankCode?: string; bankBranch?: string };
  method?: string;
}

const Component = ({ kycProps, accounts, document, playerId, onEditImage, onSubmit, onDecline }: Props) => {
  const account =
    kycProps.values.accountId &&
    accounts &&
    find((acc: AccountActive) => acc.id === kycProps.values.accountId)(accounts);
  const defaultDocuments = useMemo(
    () => (account && account.documents && mapDocuments(account.documents)) || [],
    [account],
  );
  const defaultAccount = accounts && document && find((acc: AccountActive) => acc.id === document.accountId)(accounts);
  const isPaymentType = kycProps.values.documentType === ("payment_method" as DocumentType);

  useEffect(() => {
    if (kycProps.values.documentType === null) {
      return;
    }
    if (!isPaymentType) {
      kycProps.setErrors({});
    }
  }, [isPaymentType, kycProps]);

  const handleSubmit = useCallback(
    (paymentAccount: FormValues, formikActions: FormikHelpers<FormValues>) => {
      onSubmit(paymentAccount, formikActions, {
        ...kycProps.values,
        kycChecked: document.kycChecked,
      });
    },
    [document.kycChecked, kycProps.values, onSubmit],
  );

  const initialValues: FormValues = useMemo(
    () =>
      ({
        ...(account || initialPaymentAccount),
        documents: defaultAccount ? [...defaultDocuments] : [document, ...defaultDocuments],
      } as FormValues),
    [account, defaultAccount, defaultDocuments, document],
  );

  return (
    <>
      <KycProcessForm formikProps={kycProps} accounts={accounts} document={document} onEditImage={onEditImage} />
      <Box mt={3}>
        <Formik
          onSubmit={handleSubmit}
          enableReinitialize={true}
          initialValues={initialValues}
          validateOnMount={true}
          validate={validatePaymentAccount}
        >
          {paymentAccountProps => (
            <>
              {(account || kycProps.values.accountId === "new") && (
                <Box>
                  <PaymentAccountForm
                    // @ts-ignore
                    formikProps={paymentAccountProps}
                    formType={kycProps.values.accountId === "new" ? "" : "edit"}
                    disableIconButton={true}
                  />
                </Box>
              )}
              {kycProps.values.documentType && kycProps.values.documentType !== "other" && (
                <>
                  <Box mt={3}>
                    <Divider light />
                  </Box>

                  <Box mt={3}>
                    <PlayerDetailsContainer playerId={playerId} />
                  </Box>

                  <Box mt={3}>
                    <Divider light />
                  </Box>

                  <Box mt={3}>
                    <AccountStatusContainer playerId={playerId} />
                  </Box>
                </>
              )}
              <Box mt={3}>
                <Button
                  type="submit"
                  disabled={isPaymentType ? !(paymentAccountProps.isValid && kycProps.isValid) : !kycProps.isValid}
                  onClick={isPaymentType ? paymentAccountProps.submitForm : kycProps.submitForm}
                >
                  Document checked
                </Button>
                <Button onClick={onDecline} style={{ marginLeft: "16px" }}>
                  Decline Document
                </Button>
              </Box>
            </>
          )}
        </Formik>
      </Box>
    </>
  );
};

export default Component;
