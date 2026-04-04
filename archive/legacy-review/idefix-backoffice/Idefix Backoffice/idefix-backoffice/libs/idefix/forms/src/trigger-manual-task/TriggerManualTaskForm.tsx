import React, { FC } from "react";
import { Form, Field } from "formik";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import { makeStyles } from "@mui/styles";

import { SelectField } from "../formik-fields/SelectField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";
import { MarkdownField } from "../formik-fields/MarkdownField";
import { CheckboxField } from "../formik-fields/CheckboxField";
import { Risk } from "@idefix-backoffice/idefix/types";

const useStyles = makeStyles({
  box: {
    "& > *": { marginTop: "16px" }
  }
});

interface Props {
  risks: Risk[];
}

const TriggerManualTaskForm: FC<Props> = ({ risks }) => {
  const classes = useStyles();

  return (
    <Box component={Form} display="flex" flexDirection="column">
      <Field component={ErrorMessageField} />
      <Field name="fraudKey" label="Risk Type" component={SelectField}>
        {risks.map(({ fraudKey, name }) => (
          <MenuItem key={fraudKey} value={fraudKey}>
            {name}
          </MenuItem>
        ))}
      </Field>
      <Field name="note" component={MarkdownField} />
      <Field name="checked" component={CheckboxField} label="Mark task checked" />
    </Box>
  );
};

export { TriggerManualTaskForm };
