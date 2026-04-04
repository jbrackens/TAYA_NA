import React, { FC } from "react";
import { Field, Form, Formik, FormikHelpers } from "formik";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import { TextField } from "../formik-fields/TextField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";
import { validationSchema } from "./validationSchema";

const initialValues = {
  newPassword: "",
  confirmPassword: ""
};

interface Props {
  onSubmit: (
    { newPassword, confirmPassword }: typeof initialValues,
    formikActions: FormikHelpers<typeof initialValues>
  ) => Promise<void>;
}

const ResetPasswordForm: FC<Props> = ({ onSubmit }) => {
  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={onSubmit}>
      {props => (
        <Box component={Form} display="flex" flexDirection="column" minWidth={420}>
          <Field component={ErrorMessageField} />
          <Field name="newPassword" label="New password" type="password" component={TextField} />
          <Field name="confirmPassword" label="Confirm password" type="password" component={TextField} />
          <Box alignSelf="flex-end">
            <Button color="primary" type="submit" disabled={!props.isValid || props.isSubmitting || !props.dirty}>
              Reset
            </Button>
          </Box>
        </Box>
      )}
    </Formik>
  );
};

export { ResetPasswordForm };
