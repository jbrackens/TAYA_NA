import React, { FC, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Box from "@material-ui/core/Box";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Button from "@material-ui/core/Button";
import { AccountStatusForm, validationSchema } from "../../forms/account-status";
import { closeDialog } from "../";
import { accountStatus } from "./actions";

export type FormValues = { reason: string };

interface Props {
  payload: {
    title: string;
    callback: (reason: string) => void;
  };
  meta?: unknown;
}

const AccountStatusDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();
  const title = payload?.title;

  const handleSubmit = useCallback(
    ({ reason }, formActions: FormikHelpers<FormValues>) => {
      dispatch(accountStatus({ payload, reason, formActions }));
    },
    [dispatch, payload],
  );

  const handleCloseDialog = useCallback(() => dispatch(closeDialog("account-status")), [dispatch]);

  const initialValues: FormValues = useMemo(
    () => ({
      reason: "",
    }),
    [],
  );

  return (
    <Dialog open={true} onClose={handleCloseDialog} transitionDuration={0} maxWidth="md">
      <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={validationSchema}>
        {props => (
          <>
            <DialogTitle>{title || ""}</DialogTitle>
            <DialogContent>
              <Box minWidth={400}>
                <AccountStatusForm />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                color="primary"
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
              >
                Submit
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default AccountStatusDialog;
