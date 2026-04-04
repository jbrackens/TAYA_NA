import React from "react";
import { Field, Form } from "formik";
import Typography from "@mui/material/Typography";

import { ErrorMessageField } from "../formik-fields/ErrorMessageField";

const ConfirmCancelWithdrawalForm = () => (
  <Form>
    <Field component={ErrorMessageField} />
    <Typography>Are you sure you want to cancel withdrawal?</Typography>
  </Form>
);

export { ConfirmCancelWithdrawalForm };
