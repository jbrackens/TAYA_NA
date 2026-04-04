import React from "react";
import { Form, Field } from "formik";
import Box from "@mui/material/Box";

import { TextField } from "../formik-fields/TextField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";

interface Props {
  invalidLoginDetails: boolean;
  onOpenResetPasswordDialog: () => void;
}

const AuthenticationForm = (props: Props) => {
  const { invalidLoginDetails, onOpenResetPasswordDialog } = props;

  return (
    <Form>
      <Field component={ErrorMessageField} />
      <Field autoComplete="nope" fullWidth name="email" label="Email" component={TextField} />
      <Field
        autoComplete="new-password"
        fullWidth
        name="password"
        label="Password"
        type="password"
        component={TextField}
      />
      {invalidLoginDetails && (
        <Box display="flex" justifyContent="flex-end" mt="20px">
          <Box component="p" onClick={onOpenResetPasswordDialog}>
            Forgot password?
          </Box>
        </Box>
      )}
    </Form>
  );
};

export { AuthenticationForm };
