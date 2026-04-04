import React, { FC } from "react";
import { Field, Form } from "formik";
import Typography from "@mui/material/Typography";

import { ErrorMessageField } from "../formik-fields/ErrorMessageField";

const AcceptWithdrawalForm: FC = () => (
  <Form>
    <Field component={ErrorMessageField} />
    <Typography>Are you sure you want to accept withdrawal?</Typography>
  </Form>
);

export { AcceptWithdrawalForm };
