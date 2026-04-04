import React, { ReactNode } from "react";
import Box from "@mui/material/Box";
import { FieldProps } from "formik";

import { Mde } from "@idefix-backoffice/idefix/components";

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
          {errors[name] as ReactNode}
        </Box>
      )}
    </Box>
  );
};

export { MarkdownField };
