import React from "react";
import { Field, Form } from "formik";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import TextField from "../formik-fields/TextField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";

const ConfirmMarkAsUsedForm = () => (
  <Form>
    <Field component={ErrorMessageField} />
    <Typography>Are you sure?</Typography>
    <Box mt={2}>
      <Field name="comment" label="Note" multiline component={TextField} />
    </Box>
  </Form>
);

export default ConfirmMarkAsUsedForm;
