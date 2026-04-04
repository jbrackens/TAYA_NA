import React from "react";
import { Field, Form } from "formik";
import Typography from "@material-ui/core/Typography";
import ErrorMessageField from "../formik-fields/ErrorMessageField";

const ConfirmDeclineKycForm = () => (
  <Form>
    <Field component={ErrorMessageField} />
    <Typography>Are you sure you want to decline?</Typography>
  </Form>
);

export default ConfirmDeclineKycForm;
