import React from "react";
import MaterialTextField from "@mui/material/TextField";
import { getIn } from "formik";
import isNil from "lodash/fp/isNil";
import { FieldProps } from "formik";

interface Props extends FieldProps {
  disabled?: boolean;
  onChange?: (value: string) => void;
  helperText?: string;
}

const fieldToTextField = ({ field, form, disabled, onChange, ...rest }: Props) => {
  const { name, value } = field;
  const { touched, errors, isSubmitting } = form;

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(event.target.value);
    }
    return field.onChange(event);
  };

  const fieldValue = !isNil(value) ? value : "";
  const fieldError = getIn(errors, name);
  const showError = getIn(touched, name) && !!fieldError;

  return {
    ...rest,
    ...field,
    error: showError,
    value: fieldValue,
    helperText: showError ? fieldError : rest.helperText,
    disabled: disabled !== undefined ? disabled : isSubmitting,
    onChange: handleOnChange
  };
};

interface TextFieldProps extends FieldProps {
  children: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
}

const TextField = ({ children, ...rest }: TextFieldProps) => {
  return (
    <MaterialTextField margin="normal" fullWidth required={rest.required} {...fieldToTextField(rest)}>
      {children}
    </MaterialTextField>
  );
};

export { TextField };
