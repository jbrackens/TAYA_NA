import React from "react";
import { Field, Form } from "formik";
import { Typography } from "@material-ui/core";
import ErrorMessageField from "../formik-fields/ErrorMessageField";

const AcceptWithdrawalForm = () => (
  <Form>
    <Field component={ErrorMessageField} />
    <Typography>Are you sure you want to accept withdrawal?</Typography>
  </Form>
);

export default AcceptWithdrawalForm;
