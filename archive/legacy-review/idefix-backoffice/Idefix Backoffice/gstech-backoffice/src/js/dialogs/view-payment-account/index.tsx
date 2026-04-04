import React, { FC, useCallback, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { closeDialog } from "../";
import { updateAccount } from "./actions";
import { PaymentAccountForm, validate } from "../../forms/payment-account";
import { AccountDocument, PlayerAccount } from "app/types";
import { ACCOUNT_IDENTIFIER_LABEL } from "../../core/constants";

export interface FormValues {
  method: keyof typeof ACCOUNT_IDENTIFIER_LABEL;
  account: string;
  parameters: {
    bic: string;
    accountType?: string;
    bankCode?: string;
    bankBranch?: string;
  };
  kycChecked: boolean;
  documents?: AccountDocument[];
}

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
    documents: any;
  };
  meta?: unknown;
}

const ViewPaymentAccount: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();
  const [documentsForRemove, setDocumentsForRemove] = useState<AccountDocument[]>([]);
  const { method, account, parameters, kycChecked, documents = [] } = (payload && payload.account) || {};

  const handleSubmit = useCallback(
    (accountDraft: FormValues, formikActions: FormikHelpers<FormValues>) => {
      const { playerId, account } = payload;

      dispatch(
        updateAccount({
          playerId,
          accountId: account.id,
          accountDraft: { ...accountDraft, documentsForRemove },
          formikActions,
        }),
      );
    },
    [dispatch, documentsForRemove, payload],
  );

  const handleClose = useCallback(() => dispatch(closeDialog("view-payment-account")), [dispatch]);

  const initialValues: FormValues = useMemo(
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
          expiryDate: expiryDate && new Date(expiryDate),
        })),
      } as unknown as FormValues),
    [account, documents, kycChecked, method, parameters],
  );

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleClose} maxWidth="md">
      <Formik initialValues={initialValues} validate={validate} onSubmit={handleSubmit}>
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

export default ViewPaymentAccount;
