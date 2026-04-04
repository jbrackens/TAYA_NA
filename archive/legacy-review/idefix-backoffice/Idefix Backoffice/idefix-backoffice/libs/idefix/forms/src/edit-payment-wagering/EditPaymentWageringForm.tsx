import React, { FC } from "react";
import { Field, Form } from "formik";
import Box from "@mui/material/Box";

import { TextField } from "../formik-fields/TextField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";

const EditPaymentWageringForm: FC = () => {
  return (
    <Box component={Form} display="flex" flexDirection="column">
      <Field component={ErrorMessageField} />
      <Field name="amount" label="Deposited amount" component={TextField} disabled={true} />
      <Field name="counterType" label="Counter type" component={TextField} disabled={true} />
      <Field name="counterValue" label="Wagered amount" component={TextField} disabled={true} />
      <Field name="counterTarget" label="Wagering requirement" component={TextField} />
    </Box>
  );
};

export { EditPaymentWageringForm };
