import React from "react";
import { Field } from "formik";
import MenuItem from "@material-ui/core/MenuItem";
import SelectField from "../formik-fields/SelectField";
import { validateDuration } from "./validation";

export default () => (
  <Field name="duration" label="Limit will be active for" validate={validateDuration} fullWidth component={SelectField}>
    <MenuItem value="indefinite">Indefinite</MenuItem>
    <MenuItem value={1}>1 day</MenuItem>
    <MenuItem value={2}>2 days</MenuItem>
    <MenuItem value={3}>3 days</MenuItem>
    <MenuItem value={4}>4 days</MenuItem>
    <MenuItem value={5}>5 days</MenuItem>
    <MenuItem value={6}>6 days</MenuItem>
    <MenuItem value={7}>1 week</MenuItem>
    <MenuItem value={14}>2 weeks</MenuItem>
    <MenuItem value={21}>3 weeks</MenuItem>
    <MenuItem value={30}>1 month</MenuItem>
    <MenuItem value={60}>2 months</MenuItem>
    <MenuItem value={90}>3 months</MenuItem>
    <MenuItem value={120}>4 months</MenuItem>
    <MenuItem value={150}>5 months</MenuItem>
    <MenuItem value={180}>6 months</MenuItem>
    <MenuItem value={365}>1 year</MenuItem>
  </Field>
);
