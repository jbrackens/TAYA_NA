import React, { FC } from "react";
import { Field, Form } from "formik";
import Box from "@mui/material/Box";
import FormGroup from "@mui/material/FormGroup";
import Typography from "@mui/material/Typography";

import { ToggleField } from "../formik-fields/ToggleField";
import { CheckboxField } from "../formik-fields/CheckboxField";
import { MarkdownField } from "../formik-fields/MarkdownField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";

interface Props {
  isRiskManagerRole: boolean | undefined;
}

const AccountSuspendForm: FC<Props> = ({ isRiskManagerRole }) => {
  return (
    <Form>
      <Field component={ErrorMessageField} />

      <Box>
        <Typography>Reason(s) for account closure:</Typography>
        <Box mt={1}>
          <FormGroup>
            <Field
              name="flag_gambling_problem"
              component={CheckboxField}
              label={
                <Box component="span" color="#F31431">
                  Gambling Problem
                </Box>
              }
            />
            <Field name="flag_multiple" component={CheckboxField} label="Multiple accounts" />
            <Field name="flag_fake" component={CheckboxField} label="Fake details" />
            <Field name="flag_fraudulent" component={CheckboxField} label="Fraudulent behaviour" />
            <Field name="flag_suspicious" component={CheckboxField} label="Suspicious connections" />
            <Field name="flag_ipcountry" component={CheckboxField} label="IP/country mismatch" />
            {isRiskManagerRole && (
              <Field
                name="flag_data_removal"
                component={CheckboxField}
                label={<Box component="span">GDPR data removal request</Box>}
              />
            )}
          </FormGroup>
        </Box>
      </Box>

      <Box mt={2}>
        <Field
          name="accountClosed"
          component={ToggleField}
          label="Allow creation of new account with same email/phone"
        />
      </Box>

      <Box mt={2}>
        <Typography>Notes</Typography>
        <Box mt={1}>
          <Field name="note" component={MarkdownField} />
        </Box>
      </Box>
    </Form>
  );
};

export { AccountSuspendForm };
