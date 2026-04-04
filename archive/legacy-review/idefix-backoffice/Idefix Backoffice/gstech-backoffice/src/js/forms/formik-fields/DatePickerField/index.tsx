import React from "react";
import moment from "moment-timezone";
import { KeyboardDatePicker as MaterialDatePicker } from "@material-ui/pickers";
import { getIn } from "formik";
import { FieldProps } from "formik/dist/Field";
import { MaterialUiPickersDate } from "@material-ui/pickers/typings/date";

interface Props extends FieldProps {
  allowPast?: boolean;
  disabled?: boolean;
}

const DatePicker = (props: Props) => {
  const {
    field: { name, value },
    form: { touched, errors, isSubmitting, setFieldValue },
    allowPast = true,
    disabled,
    ...rest
  } = props;

  const fieldError = errors[name];

  const showError = getIn(touched, name) && !!fieldError;

  const handleChange = (date: MaterialUiPickersDate) =>
    Date.parse(date?.toISOString() || "") ? setFieldValue(name, date?.toISOString()) : setFieldValue(name, null);

  return (
    <MaterialDatePicker
      {...rest}
      {...(allowPast
        ? {}
        : {
            minDate: moment().add(1, "day").toDate(),
          })}
      autoOk={true}
      disabled={disabled || isSubmitting}
      inputVariant="outlined"
      format="DD.MM.yyyy"
      margin="normal"
      error={showError}
      value={value && value !== "" ? new Date(value) : null}
      onChange={handleChange}
    />
  );
};

export default DatePicker;
