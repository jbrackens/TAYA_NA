import React from "react";
import { FieldProps } from "formik/dist/Field";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch, { SwitchProps } from "@material-ui/core/Switch";

interface Props extends FieldProps {
  label?: string;
}

const Toggle = ({ field, form, label, ...rest }: Props) => {
  const { name } = field;
  const { isSubmitting, setFieldValue } = form;
  const isChecked = form.values[name] || false;

  const props = {
    checked: isChecked,
    color: "primary",
    onBlur: (event: React.FocusEvent<HTMLInputElement>) => event.preventDefault(),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setFieldValue(name, event.target.checked),
    ...rest,
  } as SwitchProps;

  return <FormControlLabel disabled={isSubmitting} label={label} control={<Switch {...props} />} />;
};

export default Toggle;
