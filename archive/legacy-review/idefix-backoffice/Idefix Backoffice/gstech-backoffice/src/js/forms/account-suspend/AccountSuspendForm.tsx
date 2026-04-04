import React from "react";
import { Field, Form } from "formik";
import Box from "@material-ui/core/Box";
import FormGroup from "@material-ui/core/FormGroup";
import Toggle from "../formik-fields/ToggleField";
import Checkbox from "../formik-fields/CheckboxField";
import Markdown from "../formik-fields/MarkdownField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import { Typography } from "@material-ui/core";

const AccountSuspendForm = ({ isRiskManagerRole }: { isRiskManagerRole: boolean | undefined }) => {
  return (
    <Form>
      <Field component={ErrorMessageField} />

      <Box>
        <Typography>Reason(s) for account closure:</Typography>
        <Box mt={1}>
          <FormGroup>
            <Field
              name="flag_gambling_problem"
              component={Checkbox}
              label={
                <Box component="span" color="#F31431">
                  Gambling Problem
                </Box>
              }
            />
            <Field name="flag_multiple" component={Checkbox} label="Multiple accounts" />
            <Field name="flag_fake" component={Checkbox} label="Fake details" />
            <Field name="flag_fraudulent" component={Checkbox} label="Fraudulent behaviour" />
            <Field name="flag_suspicious" component={Checkbox} label="Suspicious connections" />
            <Field name="flag_ipcountry" component={Checkbox} label="IP/country mismatch" />
            {isRiskManagerRole && (
              <Field
                name="flag_data_removal"
                component={Checkbox}
                label={<Box component="span">GDPR data removal request</Box>}
              />
            )}
          </FormGroup>
        </Box>
      </Box>

      <Box mt={2}>
        <Field name="accountClosed" component={Toggle} label="Allow creation of new account with same email/phone" />
      </Box>

      <Box mt={2}>
        <Typography>Notes</Typography>
        <Box mt={1}>
          <Field name="note" component={Markdown} />
        </Box>
      </Box>
    </Form>
  );
};

export default AccountSuspendForm;
