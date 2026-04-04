import React from "react";
import { Field, Form } from "formik";
import { Typography } from "@material-ui/core";
import ErrorMessageField from "../formik-fields/ErrorMessageField";

const AcceptWithdrawalWithDelayForm = () => (
  <Form>
    <Field component={ErrorMessageField} />
    <Typography>Are you sure you want to accept withdrawal with 2 hours delay?</Typography>
  </Form>
);

export default AcceptWithdrawalWithDelayForm;
