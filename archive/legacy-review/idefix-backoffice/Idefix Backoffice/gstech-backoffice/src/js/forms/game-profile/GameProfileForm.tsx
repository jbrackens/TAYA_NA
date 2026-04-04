import React from "react";
import { Field, Form } from "formik";
import Box from "@material-ui/core/Box";
import MenuItem from "@material-ui/core/MenuItem";
import TextField from "../formik-fields/TextField";
import SelectField from "../formik-fields/SelectField";
import { PLAYER_RISK_PROFILE } from "../../core/constants";

const GameProfileForm = () => (
  <Box component={Form} display="flex" flexDirection="column" width="400px">
    <Field name="name" label="Name" component={TextField} />
    <Field name="wageringMultiplier" label="Wagering multiplier" component={TextField} />
    <Field name="riskProfile" label="Default risk profile" component={SelectField}>
      {PLAYER_RISK_PROFILE.map(({ value, label }) => (
        <MenuItem value={value} key={value}>
          {label}
        </MenuItem>
      ))}
    </Field>
  </Box>
);

export default GameProfileForm;
