import React from "react";
import Box from "@material-ui/core/Box";
import { FieldProps } from "formik/dist/Field";

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

export default ErrorMessageField;
