import React, { FC } from "react";
import { Formik } from "formik";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { AuthenticationForm, authenticationValidationSchema } from "@idefix-backoffice/idefix/forms";
import { useAuthentication } from "./hooks";

const LoginDialog: FC = () => {
  const { handleLogin, handleOpenDialog, initialValues, invalidLoginDetails } = useAuthentication();

  return (
    <Dialog open={true} transitionDuration={0}>
      <Formik initialValues={initialValues} validationSchema={authenticationValidationSchema} onSubmit={handleLogin}>
        {props => (
          <>
            <DialogTitle>Please log in</DialogTitle>
            <DialogContent>
              <Box minWidth="450px">
                <AuthenticationForm
                  invalidLoginDetails={invalidLoginDetails}
                  onOpenResetPasswordDialog={handleOpenDialog}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                color="primary"
                onClick={props.submitForm}
                disabled={!props.isValid || props.isSubmitting || !props.dirty}
              >
                Continue
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};

export { LoginDialog };
