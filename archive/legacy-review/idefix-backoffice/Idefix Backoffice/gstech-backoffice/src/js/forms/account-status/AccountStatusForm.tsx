import React from "react";
import { Field, Form } from "formik";
import TextField from "../formik-fields/TextField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";

const AccountStatusForm = () => (
  <Form>
    <Field component={ErrorMessageField} />
    <Field name="reason" label="Reason" fullWidth multiline rows={3} component={TextField} />
  </Form>
);

export default AccountStatusForm;
