import React, { FC } from "react";
import { Field, Form } from "formik";
import Typography from "@mui/material/Typography";

import { ErrorMessageField } from "../formik-fields/ErrorMessageField";

const ConfirmDeclineKycForm: FC = () => (
  <Form>
    <Field component={ErrorMessageField} />
    <Typography>Are you sure you want to decline?</Typography>
  </Form>
);

export { ConfirmDeclineKycForm };
