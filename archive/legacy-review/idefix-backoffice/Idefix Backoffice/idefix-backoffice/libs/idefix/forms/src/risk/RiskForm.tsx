import React from "react";
import { Form, Field } from "formik";
import capitalize from "lodash/fp/capitalize";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";

import { TextField } from "../formik-fields/TextField";
import { SelectField } from "../formik-fields/SelectField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";
import { CheckboxField } from "../formik-fields/CheckboxField";

const RiskForm = () => {
  return (
    <Box component={Form} display="flex" flexDirection="column">
      <Field component={ErrorMessageField} />
      <Field name="type" label="Type" component={SelectField}>
        {["customer", "transaction", "interface", "geo"].map(value => (
          <MenuItem key={value} value={value}>
            {capitalize(value)}
          </MenuItem>
        ))}
      </Field>
      <Field name="fraudKey" label="Fraud Key" component={TextField} />
      <Box>
        <Field name="points" label="Points" component={TextField} />
        <Field name="maxCumulativePoints" label="Max Cumulative Points" component={TextField} />
      </Box>
      <Field name="requiredRole" label="Required Role" component={SelectField}>
        {["administrator", "riskManager", "payments", "agent"].map(value => (
          <MenuItem key={value} value={value}>
            {capitalize(value)}
          </MenuItem>
        ))}
      </Field>
      <Field name="active" label="Active" component={SelectField}>
        {[true, false].map(value => (
          <MenuItem key={value.toString()} value={value.toString()}>
            {capitalize(value.toString())}
          </MenuItem>
        ))}
      </Field>
      <Field name="name" label="Name" component={TextField} />
      <Field name="title" label="Title" multiline rows={3} component={TextField} />
      <Field name="description" label="Description" multiline rows={2} component={TextField} />
      <Field name="manualTrigger" component={CheckboxField} label="Manual trigger" />
    </Box>
  );
};

export { RiskForm };
