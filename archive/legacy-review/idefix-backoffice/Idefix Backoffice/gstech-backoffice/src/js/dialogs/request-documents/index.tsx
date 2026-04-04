import React, { FC, useCallback, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import pickBy from "lodash/fp/pickBy";
import keys from "lodash/fp/keys";
import isNil from "lodash/fp/isNil";
import omitBy from "lodash/fp/omitBy";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { RequestDocumentsForm, validationSchema } from "../../forms/request-documents";
import { requestDocuments } from "./actions";
import { closeDialog } from "../";
import { fetchAccounts } from "../add-transaction/actions";
import { KycRequestDraft, PlayerPaymentAccounts } from "app/types";

export interface FormValues {
  requestAutomatically: boolean;
  note?: string;
  message?: string;
  identification: boolean;
  utility_bill: boolean;
  verification: boolean;
  payment_method?: number[];
  source_of_wealth: boolean;
}

interface Props {
  payload: number;
  meta: PlayerPaymentAccounts | null;
}

const RequestDocumentsDialog: FC<Props> = ({ payload: playerId, meta }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchAccounts(playerId));
  }, [dispatch, playerId]);

  const handleCloseDialog = useCallback(() => dispatch(closeDialog("request-documents")), [dispatch]);

  const handleSubmit = useCallback(
    (values: FormValues, formikActions: FormikHelpers<FormValues>) => {
      const { requestAutomatically, note, message, payment_method, verification, ...rest } = values;

      const documentTypes = keys(pickBy(value => value === true, rest)).map(type => ({ type }));

      let documents = [...documentTypes];

      if (verification) {
        const paymentMethods = payment_method?.map(accountId => ({ type: "payment_method", accountId })) || [];
        documents = [...documents, ...paymentMethods];
      }

      const draft = omitBy(isNil, { requestAutomatically, note, message, documents }) as unknown as KycRequestDraft;

      dispatch(requestDocuments({ playerId, requestData: draft, formikActions }));
    },
    [playerId, dispatch],
  );

  const initialValues: FormValues = useMemo(
    () => ({
      requestAutomatically: true,
      identification: false,
      utility_bill: false,
      verification: false,
      source_of_wealth: false,
    }),
    [],
  );

  return (
    <Dialog open={true} transitionDuration={0} maxWidth="md" onClose={handleCloseDialog}>
      <Formik onSubmit={handleSubmit} validationSchema={validationSchema} initialValues={initialValues}>
        {props => (
          <>
            <DialogTitle>Request documents</DialogTitle>
            <DialogContent>
              <RequestDocumentsForm accounts={meta?.accounts} values={props.values} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog} color="primary">
                Cancel
              </Button>
              <Button
                onClick={props.submitForm}
                type="submit"
                disabled={!props.isValid || props.isSubmitting}
                color="primary"
              >
                Send Request
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default RequestDocumentsDialog;
