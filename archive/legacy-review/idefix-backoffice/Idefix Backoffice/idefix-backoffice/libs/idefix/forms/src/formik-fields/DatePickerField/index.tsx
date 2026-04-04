import React, { useCallback } from "react";
import { DesktopDatePicker } from "@mui/x-date-pickers/DesktopDatePicker";
import TextField from "@mui/material/TextField";
import { getIn, FieldProps } from "formik";
import { isValid } from "date-fns";

interface Props extends FieldProps {
  allowPast?: boolean;
  disabled?: boolean;
}

const DatePickerField = (props: Props) => {
  const {
    field: { name, value },
    form: { touched, errors, isSubmitting, setFieldValue },
    allowPast = true,
    disabled,
    ...rest
  } = props;

  const fieldError = errors[name];
  const showError = getIn(touched, name) && !!fieldError;

  const handleChange = useCallback(
    (value: Date | null) => {
      if (value && isValid(value)) {
        setFieldValue(name, value.toISOString());
      } else {
        setFieldValue(name, null);
      }
    },
    [name, setFieldValue]
  );

  return (
    <DesktopDatePicker
      {...rest}
      minDate={allowPast ? undefined : new Date()}
      disabled={disabled || isSubmitting}
      value={value && value !== "" ? new Date(value) : null}
      onChange={handleChange}
      renderInput={params => <TextField {...params} margin="normal" error={showError} />}
    />
  );
};

export { DatePickerField };
