import React, { FC } from "react";
import { Field, Form } from "formik";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import MenuItem from "@mui/material/MenuItem";

import { PlayerPaymentAccounts } from "@idefix-backoffice/idefix/types";

import { CheckboxField } from "../formik-fields/CheckboxField";
import { TextField } from "../formik-fields/TextField";
import { SelectField } from "../formik-fields/SelectField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";
import { RequestDocumentsFormValues } from "./types";

// const useStyles = makeStyles(theme => ({
//   description: {
//     fontSize: "12px",
//     lineHeight: "16px",
//     color: theme.colors.blackDark
//   }
// }));

interface Props {
  accounts: PlayerPaymentAccounts["accounts"] | undefined;
  values: RequestDocumentsFormValues;
}

const RequestDocumentsForm: FC<Props> = ({ accounts, values }) => {
  // const classes = useStyles();

  return (
    <Box component={Form} display="flex" flexDirection="column" maxWidth="400px">
      <Field component={ErrorMessageField} />
      <Field name="requestAutomatically" label="Request from customer automatically" component={CheckboxField} />
      <Typography>We'll send an email and show a notification on site requesting for documents.</Typography>
      <Field name="note" label="Note" component={TextField} />
      <Field name="message" label="Message for customer" component={TextField} />
      <Typography style={{ marginTop: "32px", marginBottom: "24px" }}>
        Choose what documents you need to request from the user to confirm your identity.
      </Typography>
      <Field name="identification" label="ID-document" component={CheckboxField} />
      <Field name="utility_bill" label="Utility Bill" component={CheckboxField} />
      <Field name="verification" label="Payment account verification" component={CheckboxField} />
      <Field
        name="payment_method"
        label="Select payment account"
        disabled={!values.verification}
        multiple
        component={SelectField}
      >
        {accounts &&
          accounts.map(({ id, account }) => (
            <MenuItem key={id} value={id}>
              {account}
            </MenuItem>
          ))}
      </Field>
      <Field name="source_of_wealth" label="Source of Wealth" component={CheckboxField} />
    </Box>
  );
};

export { RequestDocumentsForm };
