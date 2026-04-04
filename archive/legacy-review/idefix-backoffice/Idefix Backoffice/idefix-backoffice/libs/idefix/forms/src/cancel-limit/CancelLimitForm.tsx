import React, { FC } from "react";
import { Field, Form } from "formik";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { TextField } from "../formik-fields/TextField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";

interface Props {
  cancellationDays: number;
}

const CancelLimitForm: FC<Props> = ({ cancellationDays }) => {
  return (
    <Form>
      <Box>
        <Field component={ErrorMessageField} />
        <Typography variant="body1">
          There is a cool down period requirement of {cancellationDays} days for this action.
        </Typography>
        <Typography variant="body1">Are you sure you want to remove this limit now?</Typography>
        <Field name="reason" label="Reason for cancelling" fullWidth multiline rows={3} component={TextField} />
      </Box>
    </Form>
  );
};

export { CancelLimitForm };
