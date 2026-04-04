import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { PlayerAccount } from "@idefix-backoffice/idefix/types";
import { PaymentAccountForm, paymentAccountValidationSchema } from "@idefix-backoffice/idefix/forms";

import { useViewPaymentAccount } from "./hooks";

interface Props {
  payload: {
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
  };
  meta?: unknown;
}

const ViewPaymentAccountDialog: FC<Props> = ({ payload }) => {
  const { handleSubmit, handleClose, initialValues, setDocumentsForRemove } = useViewPaymentAccount(payload);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose} maxWidth="md">
      <Formik initialValues={initialValues} validate={paymentAccountValidationSchema} onSubmit={handleSubmit}>
        {props => (
          <>
            <DialogTitle>Payment account</DialogTitle>
            <DialogContent>
              <PaymentAccountForm formType="edit" formikProps={props} setDocumentsForRemove={setDocumentsForRemove} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="primary">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
                onClick={props.submitForm}
                color="primary"
              >
                Save
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { ViewPaymentAccountDialog };
