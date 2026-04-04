import React, { FC, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { Formik, FormikHelpers } from "formik";
import { closeDialog } from "../";
import { addPaymentAccount } from "./actions";
import { PaymentAccountForm, validate } from "../../forms/payment-account";
import { AccountDocument } from "app/types";
import { ACCOUNT_IDENTIFIER_LABEL } from "../../core/constants";

export type FormValues = {
  method: keyof typeof ACCOUNT_IDENTIFIER_LABEL;
  account: string;
  kycChecked: boolean;
  parameters: {
    bic: string;
    accountType?: string;
    bankCode?: string;
    bankBranch?: string;
  };
  documents?: AccountDocument[];
};

interface Props {
  payload: number;
  meta?: unknown;
}

const AddPaymentAccountDialog: FC<Props> = ({ payload: playerId }) => {
  const dispatch = useDispatch();

  const handleSubmit = useCallback(
    (values: FormValues, formikActions: FormikHelpers<FormValues>) => {
      dispatch(addPaymentAccount({ playerId, values, formikActions }));
    },
    [dispatch, playerId],
  );

  const handleCloseDialog = useCallback(() => dispatch(closeDialog("add-payment-account")), [dispatch]);

  const initialValues: FormValues = useMemo(
    () => ({
      method: "BankTransfer",
      account: "",
      kycChecked: false,
      parameters: { bic: "" },
    }),
    [],
  );

  return (
    <Dialog open={true} maxWidth="md" transitionDuration={0} onClose={handleCloseDialog}>
      <Formik onSubmit={handleSubmit} initialValues={initialValues} enableReinitialize={true} validate={validate}>
        {props => (
          <>
            <DialogTitle>Payment Account</DialogTitle>
            <DialogContent>
              <PaymentAccountForm formikProps={props} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog} color="primary">
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
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

export default AddPaymentAccountDialog;
