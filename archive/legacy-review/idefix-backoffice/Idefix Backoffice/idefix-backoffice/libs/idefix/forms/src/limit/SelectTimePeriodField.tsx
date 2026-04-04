import React, { FC } from "react";
import { Field } from "formik";
import MenuItem from "@mui/material/MenuItem";

import { SelectField } from "../formik-fields/SelectField";
import { validatePeriod } from "./validation";

const SelectTimePeriodField: FC = () => (
  <Field name="period" label="Limit type" validate={validatePeriod} fullWidth component={SelectField}>
    <MenuItem value="daily">Daily limit</MenuItem>
    <MenuItem value="weekly">Weekly limit</MenuItem>
    <MenuItem value="monthly">Monthly limit</MenuItem>
  </Field>
);

export { SelectTimePeriodField };
