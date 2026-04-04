import React, { FC } from "react";
import { Field, Form } from "formik";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";

import { PLAYER_RISK_PROFILE } from "@idefix-backoffice/idefix/utils";

import { TextField } from "../formik-fields/TextField";
import { SelectField } from "../formik-fields/SelectField";

const GameProfileForm: FC = () => (
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

export { GameProfileForm };
