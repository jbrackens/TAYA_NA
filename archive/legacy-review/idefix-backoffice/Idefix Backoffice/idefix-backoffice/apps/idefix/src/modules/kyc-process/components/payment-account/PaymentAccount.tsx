import { FC } from "react";
import { Formik, FormikProps } from "formik";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";

import { Kyc, PlayerAccount } from "@idefix-backoffice/idefix/types";
import { PaymentAccountForm, paymentAccountValidationSchema } from "@idefix-backoffice/idefix/forms";
import { usePaymentAccount } from "./usePaymentAccount";
import { PlayerDetails } from "../../../player-details";
import { AccountStatus } from "../../../account-status";

interface Props {
  kycFormikProps: FormikProps<Kyc>;
  document: Kyc;
  accounts: PlayerAccount[];
}

const PaymentAccount: FC<Props> = ({ kycFormikProps, document, accounts }) => {
  const { account, isPaymentType, initialValues, handlePaymentAccountSubmit, handleDecline } = usePaymentAccount({
    kycFormikProps,
    document,
    accounts
  });

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handlePaymentAccountSubmit}
      validate={paymentAccountValidationSchema}
      enableReinitialize
      validateOnMount
    >
      {paymentAccountFormikProps => (
        <>
          {account ||
            (kycFormikProps.values.accountId === "new" && (
              <Box>
                <PaymentAccountForm
                  // @ts-ignore
                  formikProps={paymentAccountFormikProps}
                  formType={kycFormikProps.values.accountId === "new" ? "" : "edit"}
                  disableIconButton={true}
                />
              </Box>
            ))}
          {kycFormikProps.values.documentType && kycFormikProps.values.documentType !== "other" && (
            <>
              <Box mt={3}>
                <Divider light />
              </Box>

              <Box mt={3}>
                <PlayerDetails />
              </Box>

              <Box mt={3}>
                <Divider light />
              </Box>

              <Box mt={3}>
                <AccountStatus />
              </Box>
            </>
          )}
          <Box mt={3}>
            <Button
              type="submit"
              disabled={
                isPaymentType ? !(paymentAccountFormikProps.isValid && kycFormikProps.isValid) : !kycFormikProps.isValid
              }
              onClick={isPaymentType ? paymentAccountFormikProps.submitForm : kycFormikProps.submitForm}
            >
              Document checked
            </Button>
            <Button onClick={handleDecline} style={{ marginLeft: "16px" }}>
              Decline Document
            </Button>
          </Box>
        </>
      )}
    </Formik>
  );
};

export { PaymentAccount };
