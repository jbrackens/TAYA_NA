import React, { useCallback, useEffect, useState } from "react";
import { getIn, FieldProps } from "formik";
import isNaN from "lodash/fp/isNaN";
import MaterialTextField from "@mui/material/TextField";
import trimZeros from "../helpers/trimZeros";

interface Props extends FieldProps {
  disabled?: boolean;
  helperText?: string;
}

const fieldToTextField = ({ field, form, disabled, ...rest }: Props) => {
  const { name } = field;
  const { touched, errors, isSubmitting } = form;

  const fieldError = getIn(errors, name);
  const showError = getIn(touched, name) && !!fieldError;

  return {
    ...field,
    ...rest,
    error: showError,
    helperText: showError ? fieldError : rest.helperText,
    disabled: disabled !== undefined ? disabled : isSubmitting
  };
};

interface MoneyFieldProps extends FieldProps {
  disabled?: boolean;
  helperText?: string;
}

const MoneyField = (props: MoneyFieldProps) => {
  const [stringValue, setStringValue] = useState("");
  const {
    field: { value, name },
    form: { setFieldValue }
  } = props;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const stringValue = trimZeros(e.target.value);
      const isZero = stringValue === "";
      const isNumber = !isNaN(Number(stringValue));
      const isCents = (stringValue.split(".")[1] || "").length <= 2;

      if (stringValue === "-" || stringValue === "") {
        setStringValue(stringValue);
        return setFieldValue(name, null);
      }

      if (isNumber && isCents) {
        setStringValue(isZero ? "0" : stringValue);
        const amount = Number(stringValue) * 100;
        setFieldValue(name, Math.round(amount * 100) / 100);
      }
    },
    [name, setFieldValue]
  );

  useEffect(() => {
    if ((value && value !== "") || value === 0) {
      const stringValue = (value / 100).toFixed(2);
      setStringValue(stringValue);
      setFieldValue(name, Math.round(value * 100) / 100);
    }
    // eslint-disable-next-line
  }, []);

  const propsToTextField = {
    ...props,
    value: stringValue,
    onChange: handleChange
  };

  return <MaterialTextField {...fieldToTextField(propsToTextField)} />;
};

export { MoneyField };
