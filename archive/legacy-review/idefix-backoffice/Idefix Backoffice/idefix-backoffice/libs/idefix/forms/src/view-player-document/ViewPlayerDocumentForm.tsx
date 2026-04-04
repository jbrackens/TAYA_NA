import React from "react";
import { Field, Form, FormikProps } from "formik";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";

import { Kyc, PlayerAccount } from "@idefix-backoffice/idefix/types";

import { ButtonGroupField } from "../formik-fields/ButtonGroupField";
import { KycDocumentField } from "../formik-fields/KycDocumentField";
import { DatePickerField } from "../formik-fields/DatePickerField";
import { MarkdownField } from "../formik-fields/MarkdownField";
import { SelectField } from "../formik-fields/SelectField";
import { MoneyField } from "../formik-fields/MoneyField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";

const TYPE_BUTTONS = [
  { label: "Document", key: "photo" },
  { label: "Note", key: "content" }
];

const DOCUMENT_TYPE_BUTTONS = [
  { label: "Identification", key: "identification" },
  { label: "Utility bill", key: "utility_bill" },
  { label: "Source of Wealth", key: "source_of_wealth" },
  { label: "Payment method", key: "payment_method" },
  { label: "Other", key: "other" }
];

const INCOME_TYPE = [
  { label: "Gambling", key: "gambling" },
  { label: "Salary", key: "salary" },
  { label: "Pension", key: "pension" },
  { label: "Benefits", key: "benefits" },
  { label: "Savings", key: "savings" },
  { label: "Inheritance", key: "inheritance" },
  { label: "Company", key: "company" },
  { label: "Investments", key: "investments" },
  { label: "Gift", key: "gift" },
  { label: "Loan", key: "loan" },
  { label: "Property", key: "property" },
  { label: "Other", key: "other" }
];

interface Props {
  accounts: PlayerAccount[];
  formikProps: FormikProps<Kyc>;
}

const ViewPlayerDocumentForm = ({ accounts, formikProps: { values } }: Props) => {
  const { type, photoId, content, documentType, name } = values;
  return (
    <Box component={Form} display="flex" flexDirection="column">
      <Field component={ErrorMessageField} />
      <Field name="documentType" component={ButtonGroupField} buttons={DOCUMENT_TYPE_BUTTONS} />
      {photoId == null && (content == null || content === "") && (
        <Field name="type" component={ButtonGroupField} buttons={TYPE_BUTTONS} />
      )}
      {type === "photo" && <Field name="photoId" component={KycDocumentField} fileName={name} />}
      {type === "content" && <Field name="content" component={MarkdownField} />}
      {documentType === "payment_method" && (
        <Field name="accountId" label="Payment account" component={SelectField}>
          {accounts.map(account => (
            <MenuItem value={account.id} key={account.id}>{`${account.method} - ${account.account} (${
              account.kycChecked ? "Verified" : "Not verified"
            })`}</MenuItem>
          ))}
        </Field>
      )}
      <Field name="expiryDate" label="Set document expiry date" component={DatePickerField} />
      {documentType === "source_of_wealth" && (
        <Box display="flex" flexDirection="column">
          <Field name="fields.incomeType" label="Set income type" component={SelectField}>
            {accounts &&
              INCOME_TYPE.map(type => (
                <MenuItem key={type.key} value={type.key}>
                  {type.label}
                </MenuItem>
              ))}
          </Field>
          <Field
            name="fields.incomeMonthlyAmount"
            label="Set monthly income amount"
            margin="normal"
            component={MoneyField}
          />
        </Box>
      )}
    </Box>
  );
};

export { ViewPlayerDocumentForm };
