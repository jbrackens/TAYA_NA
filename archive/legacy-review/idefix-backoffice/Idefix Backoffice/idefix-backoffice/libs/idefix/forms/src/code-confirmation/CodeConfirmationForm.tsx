import React, { FC } from "react";
import { Field, Form, Formik, FormikHelpers } from "formik";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import { CountdownTimer } from "./components/CountdownTimer";
import { TextField } from "../formik-fields/TextField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";
import { validationSchema } from "./validationSchema";

const initialValues = {
  code: ""
};

interface Props {
  text: string;
  onSubmit: ({ code }: { code: string | number }, formikActions: FormikHelpers<{ code: string | number }>) => void;
  onChangeValue: (
    key: string,
    value: string
  ) => {
    payload: any;
    type: string;
  };
  onCloseDialog: () => void;
}

const CodeConfirmationForm: FC<Props> = ({ text, onSubmit, onChangeValue, onCloseDialog }) => (
  <Formik
    initialValues={initialValues}
    validationSchema={validationSchema}
    // @ts-ignore
    onSubmit={onSubmit}
  >
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

export { CodeConfirmationForm };
