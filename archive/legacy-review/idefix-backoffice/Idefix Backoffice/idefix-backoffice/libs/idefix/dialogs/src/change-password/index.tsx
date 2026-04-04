import React, { FC } from "react";
import { Formik } from "formik";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { ChangePasswordForm, changePasswordValidationSchema } from "@idefix-backoffice/idefix/forms";

import { useChangePassword } from "./hooks";

interface Props {
  payload: string;
  meta?: unknown;
}

const ChangePasswordDialog: FC<Props> = ({ payload: email }) => {
  const { handleSubmit, initialValues } = useChangePassword(email);

  return (
    <Dialog open={true} transitionDuration={0}>
      <Formik
        initialValues={{ ...initialValues, email }}
        validationSchema={changePasswordValidationSchema}
        onSubmit={handleSubmit}
      >
        {props => (
          <>
            <DialogTitle>Change password</DialogTitle>
            <DialogContent>
              <ChangePasswordForm />
            </DialogContent>
            <DialogActions>
              <Button
                color="primary"
                type="submit"
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
              >
                Change
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { ChangePasswordDialog };
