import React, { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";

import DialogActions from "@material-ui/core/DialogActions";
import { ConfirmDeclineKycForm } from "../../forms/confirm-decline-kyc";
import { closeDialog } from "../";
import { declineKyc } from "./actions";

interface Props {
  payload: {
    playerId: number;
    documentId: number;
  };
  meta?: unknown;
}

const ConfirmDeclineKycDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();
  const { playerId, documentId } = payload;

  const handleDecline = useCallback(
    (_, formikHelpers: FormikHelpers<any>) => {
      dispatch(declineKyc(playerId, documentId, formikHelpers));
    },
    [dispatch, documentId, playerId],
  );

  const handleCloseDialog = useCallback(() => dispatch(closeDialog("confirm-decline-kyc")), [dispatch]);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleCloseDialog}>
      <Formik initialValues={{}} onSubmit={handleDecline}>
        {props => (
          <>
            <DialogTitle>Confirmation</DialogTitle>
            <DialogContent>
              <ConfirmDeclineKycForm />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" color="primary" onClick={props.submitForm}>
                Confirm
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default ConfirmDeclineKycDialog;
