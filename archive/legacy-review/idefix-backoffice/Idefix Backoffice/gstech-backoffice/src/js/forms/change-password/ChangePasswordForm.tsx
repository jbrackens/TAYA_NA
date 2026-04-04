import React from "react";
import { Form, Field } from "formik";
import Box from "@material-ui/core/Box";
import TextField from "../formik-fields/TextField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";

const ChangePasswordForm = () => (
  <Box component={Form} display="flex" flexDirection="column" minWidth={400}>
    <Field name="email" label="Email" type="email" component={TextField} disabled />
    <Field name="oldPassword" label="Old password" type="password" component={TextField} />
    <Field name="newPassword" label="New password" type="password" component={TextField} />
    <Field name="confirmPassword" label="Confirm password" type="password" component={TextField} />
    <Field component={ErrorMessageField} />
  </Box>
);

export default ChangePasswordForm;
