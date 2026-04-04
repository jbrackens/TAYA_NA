import React, { FC } from "react";
import { Field, Form } from "formik";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import TextField from "../formik-fields/TextField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";

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

export default CancelLimitForm;
