import React, { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { ConfirmMarkAsUsedForm } from "../../forms/confirm-mark-as-used";
import { closeDialog } from "../";
import { confirmMarkAsUsed } from "./actions";

export interface FormValues {
  comment: string;
}

interface Props {
  payload: {
    playerId: number;
    groupId: string;
  };
  meta?: unknown;
}

const ConfirmMarkAsUsed: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();
  const { playerId, groupId } = payload;

  const handleMarkAsUsed = useCallback(
    (values: FormValues, formikActions: FormikHelpers<FormValues>) => {
      dispatch(confirmMarkAsUsed({ playerId, groupId: Number(groupId), values, formikActions }));
    },
    [dispatch, groupId, playerId],
  );

  const handleCloseDialog = useCallback(() => dispatch(closeDialog("confirm-mark-as-used")), [dispatch]);

  return (
    <Dialog open={true} transitionDuration={0} onClose={handleCloseDialog}>
      <Formik initialValues={{ comment: "" }} onSubmit={handleMarkAsUsed}>
        {props => (
          <>
            <DialogTitle>Confirmation</DialogTitle>
            <DialogContent>
              <ConfirmMarkAsUsedForm />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" onClick={props.submitForm} disabled={props.isSubmitting} color="primary">
                Mark as Used
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default ConfirmMarkAsUsed;
