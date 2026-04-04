import React from "react";
import { Field, Form } from "formik";
import TextField from "../formik-fields/TextField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";

const CompleteDepositTransactionForm = ({ disableTransactionIdField }: { disableTransactionIdField: boolean }) => {
  return (
    <Form>
      <Field component={ErrorMessageField} />
      <Field
        name="transactionId"
        label="Transaction id"
        fullWidth
        component={TextField}
        disabled={disableTransactionIdField}
      />
      <Field name="reason" label="Type your reason" fullWidth multiline rows={3} component={TextField} />
    </Form>
  );
};

export default CompleteDepositTransactionForm;
