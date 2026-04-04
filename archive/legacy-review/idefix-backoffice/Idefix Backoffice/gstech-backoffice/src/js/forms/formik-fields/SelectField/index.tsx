import React, { useCallback } from "react";
import FormControl from "@material-ui/core/FormControl";
import FormHelperText from "@material-ui/core/FormHelperText";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import { getIn } from "formik";
import { FieldProps } from "formik/dist/Field";

interface Props extends FieldProps {
  children: React.ReactChildren;
  fullWidth?: boolean;
  label?: string;
  disabled?: boolean;
  onChange?: (value: any) => void;
  multiple?: boolean;
}

const SelectField = ({
  children,
  fullWidth,
  label,
  disabled,
  field,
  form,
  onChange,
  multiple = false,
  ...rest
}: Props) => {
  const { name, value } = field;
  const { touched, errors, isSubmitting, setFieldValue, setFieldTouched } = form;

  const fieldValue = value != null ? value : "";
  const fieldError = getIn(errors, name);
  const showError = getIn(touched, name) && !!fieldError;
  const multipleValue = multiple ? [...fieldValue] : fieldValue;

  const handleOnChange = useCallback(
    (event: React.ChangeEvent<{ name?: string; value: unknown }>) => {
      if (onChange) {
        onChange(event.target.value);
      }
      return setFieldValue(field.name, event.target.value);
    },
    [field.name, onChange, setFieldValue],
  );

  const handleOnBlur = useCallback(() => {
    setFieldTouched(name);
  }, [name, setFieldTouched]);

  return (
    <FormControl disabled={disabled || isSubmitting} fullWidth={fullWidth} error={showError} margin="normal">
      <InputLabel>{label || ""}</InputLabel>
      <Select
        multiple={multiple}
        label={label}
        value={React.Children.count(children) ? multipleValue : ""}
        onBlur={handleOnBlur}
        onChange={handleOnChange}
        {...rest}
      >
        {children}
      </Select>
      {showError ? <FormHelperText>{fieldError}</FormHelperText> : null}
    </FormControl>
  );
};

export default SelectField;
