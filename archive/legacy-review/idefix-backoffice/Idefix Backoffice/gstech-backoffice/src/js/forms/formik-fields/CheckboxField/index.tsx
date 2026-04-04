import React from "react";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import MaterialCheckbox from "@material-ui/core/Checkbox";
import { FieldProps } from "formik/dist/Field";
import { CheckboxProps } from "@material-ui/core/Checkbox/Checkbox";

interface Props extends FieldProps {
  label?: string;
}

const Checkbox = ({ field, form, label, ...rest }: Props) => {
  const { name } = field;
  const { isSubmitting, setFieldValue } = form;
  const isChecked = form.values[name] || false;

  const props = {
    checked: isChecked,
    color: "primary",
    onChange: event => setFieldValue(name, event.target.checked),
    ...rest,
  } as CheckboxProps;

  return <FormControlLabel disabled={isSubmitting} control={<MaterialCheckbox {...props} />} label={label} />;
};

export default Checkbox;
