import React from "react";
import { Form, Field } from "formik";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import TextField from "../formik-fields/TextField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";

const useStyles = makeStyles(theme => ({
  textLink: {
    textDecoration: "underline",
    cursor: "pointer",
    color: theme.colors.blackDark,
  },
}));

interface Props {
  invalidLoginDetails: boolean;
  onOpenResetPasswordDialog: () => void;
}

const AuthenticationForm = (props: Props) => {
  const { invalidLoginDetails, onOpenResetPasswordDialog } = props;
  const classes = useStyles();

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
          <Box component="p" className={classes.textLink} onClick={onOpenResetPasswordDialog}>
            Forgot password?
          </Box>
        </Box>
      )}
    </Form>
  );
};

export default AuthenticationForm;
