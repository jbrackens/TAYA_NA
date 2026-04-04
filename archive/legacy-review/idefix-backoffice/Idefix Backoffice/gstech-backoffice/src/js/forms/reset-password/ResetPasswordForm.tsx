import React from "react";
import { Field, Form, Formik } from "formik";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import TextField from "../formik-fields/TextField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import validationSchema from "./validationSchema";

const initialValues = {
  newPassword: "",
  confirmPassword: "",
};

interface Props {
  onSubmit: ({ newPassword, confirmPassword }: any, formikActions: any) => Promise<void>;
}

const ResetPasswordForm = ({ onSubmit }: Props) => {
  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={onSubmit}>
      {props => (
        <Box component={Form} display="flex" flexDirection="column" minWidth={420}>
          <Field component={ErrorMessageField} />
          <Field name="newPassword" label="New password" type="password" component={TextField} />
          <Field name="confirmPassword" label="Confirm password" type="password" component={TextField} />
          <Box alignSelf="flex-end">
            <Button color="primary" type="submit" disabled={!props.isValid || props.isSubmitting || !props.dirty}>
              Reset
            </Button>
          </Box>
        </Box>
      )}
    </Formik>
  );
};

export default ResetPasswordForm;
