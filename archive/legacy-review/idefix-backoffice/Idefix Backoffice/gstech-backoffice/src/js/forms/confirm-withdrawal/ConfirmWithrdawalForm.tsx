import React from "react";
import { Field, Form } from "formik";
import TextField from "../formik-fields/TextField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";

const ConfirmWithdrawalForm = () => (
  <Form>
    <Field component={ErrorMessageField} />
    <Field name="externalTransactionId" label="External Transaction Id" fullWidth component={TextField} />
  </Form>
);

export default ConfirmWithdrawalForm;
