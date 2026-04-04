import React from "react";
import { FieldProps } from "formik";
import FormControlLabel from "@mui/material/FormControlLabel";
import MaterialCheckbox from "@mui/material/Checkbox";
import { CheckboxProps } from "@mui/material/Checkbox/Checkbox";

interface Props extends FieldProps {
  label?: string;
}

const CheckboxField = ({ field, form, label, ...rest }: Props) => {
  const { name } = field;
  const { isSubmitting, setFieldValue } = form;
  const isChecked = form.values[name] || false;

  const props = {
    checked: isChecked,
    color: "primary",
    onChange: event => setFieldValue(name, event.target.checked),
    ...rest
  } as CheckboxProps;

  return <FormControlLabel disabled={isSubmitting} control={<MaterialCheckbox {...props} />} label={label} />;
};

export { CheckboxField };
