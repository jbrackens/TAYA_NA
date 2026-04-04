import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { ActiveLimit } from "@idefix-backoffice/idefix/types";
import { CancelLimitForm, cancelLimitValidationSchema } from "@idefix-backoffice/idefix/forms";

import { useCancelLimit } from "./hooks";

interface Props {
  payload: {
    delay: boolean;
    limit: ActiveLimit;
    playerId: number;
  };
  meta?: unknown;
}

const CancelLimitDialog: FC<Props> = ({ payload }) => {
  const { handleSubmit, handleCloseDialog, initialValues, cancellationDays } = useCancelLimit(payload);

  return (
    <Dialog open={true} onClose={handleCloseDialog} transitionDuration={0}>
      <Formik initialValues={initialValues} validationSchema={cancelLimitValidationSchema} onSubmit={handleSubmit}>
        {({ submitForm, isValid, isSubmitting, dirty }) => (
          <>
            <DialogTitle>Cancel limits</DialogTitle>
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

export { CancelLimitDialog };
