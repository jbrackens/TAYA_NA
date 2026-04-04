import { Field, Form } from "formik";
import Box from "@mui/material/Box";

import { TextField } from "../formik-fields/TextField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";

function UserDetailsForm() {
  return (
    <Box component={Form} width={1}>
      <Box display="flex" flexDirection="column">
        <Field component={ErrorMessageField} />
        <Box display="flex" justifyContent="flex-start">
          <Box>
            <Field name="name" component={TextField} label="Name" />
          </Box>
          <Box marginLeft={2}>
            <Field name="handle" component={TextField} label="Handle" />
          </Box>
          <Box marginLeft={2}>
            <Field name="email" component={TextField} label="Email" />
          </Box>
          <Box marginLeft={2}>
            <Field name="mobilePhone" component={TextField} label="Mobile phone" />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export { UserDetailsForm };
