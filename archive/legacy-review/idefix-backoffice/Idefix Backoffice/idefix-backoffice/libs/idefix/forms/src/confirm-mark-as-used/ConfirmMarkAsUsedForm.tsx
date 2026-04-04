import React, { FC } from "react";
import { Field, Form } from "formik";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { TextField } from "../formik-fields/TextField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";

const ConfirmMarkAsUsedForm: FC = () => (
  <Form>
    <Field component={ErrorMessageField} />
    <Typography>Are you sure?</Typography>
    <Box mt={2}>
      <Field name="comment" label="Note" multiline component={TextField} />
    </Box>
  </Form>
);

export { ConfirmMarkAsUsedForm };
