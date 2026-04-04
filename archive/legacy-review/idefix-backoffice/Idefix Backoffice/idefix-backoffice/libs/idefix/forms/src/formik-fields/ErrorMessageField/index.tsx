// @ts-nocheck
import React from "react";
import Box from "@mui/material/Box";
import { FieldProps } from "formik";

const ErrorMessageField = ({ form: { errors } }: FieldProps) => {
  if (!errors || !errors.general) {
    return null;
  }

  return (
    <Box textAlign="center" color="red">
      {errors.general}
    </Box>
  );
};

export { ErrorMessageField };
