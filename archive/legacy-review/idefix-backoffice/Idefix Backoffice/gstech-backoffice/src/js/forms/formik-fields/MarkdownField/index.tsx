import React from "react";
import Box from "@material-ui/core/Box";
import Mde from "../../../core/components/mde";
import { FieldProps } from "formik/dist/Field";

interface Props extends FieldProps {
  onChange: (value: string) => void;
}

const MarkdownField = ({ field, form, onChange }: Props) => {
  const { name, value } = field;
  const { errors, setFieldValue } = form;

  const handleChange = (value: string) => {
    if (onChange) {
      onChange(value);
    }
    return setFieldValue(name, value);
  };

  return (
    <Box>
      <Mde value={value || ""} onChange={handleChange} />
      {errors[name] && (
        <Box fontSize={14} color="#f44336">
          {errors[name]}
        </Box>
      )}
    </Box>
  );
};

export default MarkdownField;
