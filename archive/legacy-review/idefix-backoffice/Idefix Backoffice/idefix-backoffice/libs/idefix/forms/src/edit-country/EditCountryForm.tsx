import React, { FC } from "react";
import { Form, Field } from "formik";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";

import { PLAYER_RISK_PROFILE } from "@idefix-backoffice/idefix/utils";

import { TextField } from "../formik-fields/TextField";
import { ToggleField } from "../formik-fields/ToggleField";
import { SelectField } from "../formik-fields/SelectField";
import { MoneyField } from "../formik-fields/MoneyField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";

const EditCountryForm: FC = () => {
  return (
    <Box component={Form} display="flex" flexDirection="column" minWidth={400}>
      <Field component={ErrorMessageField} />
      <Field name="id" label="Country code" component={TextField} disabled />
      <Field name="name" label="Name" component={TextField} disabled />
      <Field name="minimumAge" label="Minimum registration age" component={TextField} />
      <Field name="registrationAllowed" label="Registration allowed" component={ToggleField} type="checkbox" />
      <Field name="blocked" label="Blocked" component={ToggleField} type="checkbox" />
      <Field name="loginAllowed" label="Login allowed" component={ToggleField} type="checkbox" />
      <Field name="riskProfile" label="Default risk profile" component={SelectField}>
        {PLAYER_RISK_PROFILE.map(({ value, label }) => (
          <MenuItem value={value} key={value}>
            {label}
          </MenuItem>
        ))}
      </Field>
      <Field name="monthlyIncomeThreshold" label="Monthly income threshold (€)" component={MoneyField} />
    </Box>
  );
};

export { EditCountryForm };
