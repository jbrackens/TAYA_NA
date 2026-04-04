import React from "react";
import { Field, Form } from "formik";

import { ErrorMessageField } from "../formik-fields/ErrorMessageField";
import { TextField } from "../formik-fields/TextField";

const AskingForReasonForm = () => (
  <Form>
    <Field component={ErrorMessageField} />
    <Field name="reason" label="Type your reason" fullWidth multiline rows={3} component={TextField} />
  </Form>
);

export { AskingForReasonForm };
