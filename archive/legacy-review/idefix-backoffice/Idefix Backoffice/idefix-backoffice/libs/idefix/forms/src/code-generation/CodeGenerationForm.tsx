import React, { FC } from "react";
import { Formik, Form, Field, FormikHelpers } from "formik";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import { TextField } from "../formik-fields/TextField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";
import { validationSchema } from "./validationSchema";

const initialValues = {
  email: ""
};

interface Props {
  text: string;
  onChangeValue: (key: string, value: string) => void;
  onSubmit: ({ email }: typeof initialValues, formikActions: FormikHelpers<typeof initialValues>) => void;
}

const CodeGenerationForm: FC<Props> = ({ text, onChangeValue, onSubmit }) => (
  <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={onSubmit}>
    {props => (
      <Box component={Form} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
        <Field component={ErrorMessageField} />
        <Box component="p">{text}</Box>
        <Field name="email" label="Email" component={TextField} onChange={(v: string) => onChangeValue("email", v)} />
        <Button color="primary" type="submit" disabled={!props.isValid || props.isSubmitting || !props.dirty}>
          Enter
        </Button>
      </Box>
    )}
  </Formik>
);

export { CodeGenerationForm };
