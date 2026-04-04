import React, { FC } from "react";
import { Field, Form } from "formik";
import Typography from "@mui/material/Typography";

import { ErrorMessageField } from "../formik-fields/ErrorMessageField";

const AcceptWithdrawalWithDelayForm: FC = () => (
  <Form>
    <Field component={ErrorMessageField} />
    <Typography>Are you sure you want to accept withdrawal with 2 hours delay?</Typography>
  </Form>
);

export { AcceptWithdrawalWithDelayForm };
