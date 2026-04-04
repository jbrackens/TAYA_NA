import React, { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik, FormikHelpers } from "formik";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import { login } from "./actions";
import { AuthenticationForm, validationSchema } from "../../forms/authentication";
import { openDialog } from "../";
import { getIsInvalidLoginCredentials } from "../../modules/authentication";

export type FormValues = {
  email: string;
  password: string;
};

const LoginDialog = () => {
  const dispatch = useDispatch();
  const invalidLoginDetails = useSelector(getIsInvalidLoginCredentials);

  const handleLogin = useCallback(
    (values: FormValues, formikActions: FormikHelpers<FormValues>) => {
      dispatch(login(values, formikActions));
    },
    [dispatch],
  );
  const handleOpenDialog = useCallback(() => dispatch(openDialog("reset-password", {})), [dispatch]);

  const initialValues: FormValues = useMemo(
    () => ({
      email: "",
      password: "",
    }),
    [],
  );

  return (
    <Dialog open={true} transitionDuration={0}>
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleLogin}>
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

export default LoginDialog;
