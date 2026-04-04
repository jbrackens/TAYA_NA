import React from "react";
import { Field, Form } from "formik";
import Box from "@material-ui/core/Box";
import TextField from "../formik-fields/TextField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";

const CreateUserForm = () => (
  <Box component={Form} width="400px">
    <Field component={ErrorMessageField} />
    <Field name="name" label="Name" component={TextField} />
    <Field name="handle" label="Handle" component={TextField} />
    <Field name="email" label="Email" type="email" component={TextField} />
    <Field name="mobilePhone" label="Mobile Phone" type="tel" component={TextField} />
  </Box>
);

export default CreateUserForm;
