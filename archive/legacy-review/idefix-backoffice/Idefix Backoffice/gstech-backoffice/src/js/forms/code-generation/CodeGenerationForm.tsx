import React from "react";
import { Formik, Form, Field } from "formik";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import TextField from "../formik-fields/TextField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import validationSchema from "./validationSchema";

const initialValues = {
  email: "",
};

interface Props {
  text: string;
  onChangeValue: (key: string, value: string) => void;
  onSubmit: ({ email }: any, formikActions: any) => void;
}

const CodeGenerationForm = ({ text, onChangeValue, onSubmit }: Props) => (
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

export default CodeGenerationForm;
