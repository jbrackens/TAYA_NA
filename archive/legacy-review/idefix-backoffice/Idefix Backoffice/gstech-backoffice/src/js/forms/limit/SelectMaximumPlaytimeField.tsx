import React from "react";
import { Field } from "formik";
import MenuItem from "@material-ui/core/MenuItem";
import SelectField from "../formik-fields/SelectField";
import { validatePlaytimeLimit } from "./validation";

export default () => (
  <Field
    name="limit"
    label="Maximum playtime"
    validate={validatePlaytimeLimit}
    fullWidth
    component={SelectField}
  >
    <MenuItem value={15}>15 minutes</MenuItem>
    <MenuItem value={30}>30 minutes</MenuItem>
    <MenuItem value={45}>45 minutes</MenuItem>
    <MenuItem value={60}>1 hour</MenuItem>
    <MenuItem value={120}>2 hours</MenuItem>
    <MenuItem value={180}>3 hours</MenuItem>
    <MenuItem value={240}>4 hours</MenuItem>
    <MenuItem value={300}>5 hours</MenuItem>
    <MenuItem value={360}>6 hours</MenuItem>
  </Field>
);
