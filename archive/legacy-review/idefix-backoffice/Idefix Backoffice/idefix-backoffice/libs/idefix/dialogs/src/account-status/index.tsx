import React, { FC } from "react";
import { Formik } from "formik";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";

import { AccountStatusForm, accountStatusValidationSchema } from "@idefix-backoffice/idefix/forms";

import { useAccountStatus } from "./hooks";

interface Props {
  payload: {
    title: string;
    callback: (reason: string) => void;
  };
  meta?: unknown;
}

const AccountStatusDialog: FC<Props> = ({ payload }) => {
  const { handleSubmit, handleCloseDialog, initialValues } = useAccountStatus(payload);
  const title = payload?.title;

  return (
    <Dialog open={true} onClose={handleCloseDialog} transitionDuration={0} maxWidth="md">
      <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={accountStatusValidationSchema}>
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

export { AccountStatusDialog };
