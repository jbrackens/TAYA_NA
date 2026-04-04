import { FC } from "react";
import { Formik } from "formik";
import Box from "@mui/material/Box";

import { Kyc, PlayerAccount } from "@idefix-backoffice/idefix/types";
import { KycProcessForm, kycProcessValidationSchema } from "@idefix-backoffice/idefix/forms";
import { useKyc } from "./useKyc";
import { PaymentAccount } from "../payment-account/PaymentAccount";

interface Props {
  document: Kyc;
  accounts: PlayerAccount[];
}

const KycForm: FC<Props> = ({ document, accounts }) => {
  const { initialValues, handleKycSubmit, handleEditImage } = useKyc({
    document
  });

  return (
    <Formik
      onSubmit={handleKycSubmit}
      initialValues={initialValues}
      validationSchema={kycProcessValidationSchema}
      validateOnChange
      validateOnMount
      enableReinitialize
    >
      {kycFormikProps => (
        <>
          <KycProcessForm
            formikProps={kycFormikProps}
            document={document}
            accounts={accounts}
            onEditImage={handleEditImage}
          />
          <Box mt={3}>
            <PaymentAccount kycFormikProps={kycFormikProps} document={document} accounts={accounts} />
          </Box>
        </>
      )}
    </Formik>
  );
};

export { KycForm };
