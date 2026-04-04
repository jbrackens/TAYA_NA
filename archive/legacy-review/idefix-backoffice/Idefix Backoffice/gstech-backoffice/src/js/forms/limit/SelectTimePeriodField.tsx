import React from "react";
import { Field } from "formik";
import MenuItem from "@material-ui/core/MenuItem";
import SelectField from "../formik-fields/SelectField";
import { validatePeriod } from "./validation";

export default () => (
  <Field name="period" label="Limit type" validate={validatePeriod} fullWidth component={SelectField}>
    <MenuItem value="daily">Daily limit</MenuItem>
    <MenuItem value="weekly">Weekly limit</MenuItem>
    <MenuItem value="monthly">Monthly limit</MenuItem>
  </Field>
);
