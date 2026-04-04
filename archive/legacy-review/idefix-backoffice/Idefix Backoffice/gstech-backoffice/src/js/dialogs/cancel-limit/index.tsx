import { ActiveLimit, CancelLimitValues } from "app/types";
import React, { FC, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { CancelLimitForm, validationSchema } from "../../forms/cancel-limit";
import { closeDialog } from "../";
import { confirmCancelLimit } from "./actions";

interface Props {
  payload: {
    delay: boolean;
    limit: ActiveLimit;
    playerId: number;
  };
  meta?: unknown;
}

const initialValues: CancelLimitValues = {
  reason: "",
};

const CancelLimitDialog: FC<Props> = ({ payload }) => {
  const dispatch = useDispatch();
  const cancellationDays = payload && payload.limit && payload.limit.cancellationDays;

  const handleConfirmCancelLimit = useCallback(
    ({ reason }: CancelLimitValues, formActions: FormikHelpers<CancelLimitValues>) => {
      dispatch(confirmCancelLimit(payload, reason, formActions));
    },
    [dispatch, payload],
  );

  const handleCloseDialog = useCallback(() => dispatch(closeDialog("cancel-limit")), [dispatch]);

  return (
    <Dialog open={true} onClose={handleCloseDialog} transitionDuration={0}>
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleConfirmCancelLimit}>
        {({ submitForm, isValid, isSubmitting, dirty }) => (
          <>
            <DialogTitle>Cancel limitss</DialogTitle>
            <DialogContent>
              <CancelLimitForm cancellationDays={cancellationDays} />
            </DialogContent>
            <DialogActions>
              <Button color="primary" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button color="primary" type="submit" onClick={submitForm} disabled={!isValid || isSubmitting || !dirty}>
                Confirm
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export default CancelLimitDialog;
