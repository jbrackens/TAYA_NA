import React, { FC } from "react";
import { Field, Form } from "formik";
import Box from "@mui/material/Box";

import { TextField } from "../formik-fields/TextField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";

const CreateUserForm: FC = () => (
  <Box component={Form} width="400px">
    <Field component={ErrorMessageField} />
    <Field name="name" label="Name" component={TextField} />
    <Field name="handle" label="Handle" component={TextField} />
    <Field name="email" label="Email" type="email" component={TextField} />
    <Field name="mobilePhone" label="Mobile Phone" type="tel" component={TextField} />
  </Box>
);

export { CreateUserForm };
