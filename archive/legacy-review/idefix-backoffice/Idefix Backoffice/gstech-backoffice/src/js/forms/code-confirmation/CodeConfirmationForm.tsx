import React from "react";
import { Field, Form, Formik } from "formik";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import CountdownTimer from "./components/CountdownTimer";
import TextField from "../formik-fields/TextField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import validationSchema from "./validationSchema";

const initialValues = {
  code: "",
};

interface Props {
  text: string;
  onSubmit: ({ code }: any, formikActions: any) => void;
  onChangeValue: (key: any, value: any) => void;
  onCloseDialog: () => void;
}

const CodeConfirmationForm = ({ text, onSubmit, onChangeValue, onCloseDialog }: Props) => (
  <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={onSubmit}>
    {props => (
      <Box component={Form} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
        <Field component={ErrorMessageField} />
        <Box component="p">{text}</Box>
        <CountdownTimer secondsRemaining={600} onCloseDialog={onCloseDialog} />
        <Field name="code" label="Code" component={TextField} onChange={(v: string) => onChangeValue("code", v)} />
        <Button color="primary" type="submit" disabled={!props.isValid || props.isSubmitting || !props.dirty}>
          Enter
        </Button>
      </Box>
    )}
  </Formik>
);

export default CodeConfirmationForm;
