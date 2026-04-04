import React from "react";
import { FieldProps } from "formik";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch, { SwitchProps } from "@mui/material/Switch";

interface Props extends FieldProps {
  label?: string;
}

const ToggleField = ({ field, form, label, ...rest }: Props) => {
  const { name } = field;
  const { isSubmitting, setFieldValue } = form;
  const isChecked = form.values[name] || false;

  const props = {
    checked: isChecked,
    color: "primary",
    onBlur: (event: React.FocusEvent<HTMLInputElement>) => event.preventDefault(),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setFieldValue(name, event.target.checked),
    ...rest
  } as SwitchProps;

  return <FormControlLabel disabled={isSubmitting} label={label} control={<Switch {...props} />} />;
};

export { ToggleField };
