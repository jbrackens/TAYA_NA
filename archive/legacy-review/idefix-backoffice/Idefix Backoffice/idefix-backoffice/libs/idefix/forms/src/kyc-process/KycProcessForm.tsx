import React, { useCallback } from "react";
import { Field, Form, FormikProps } from "formik";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import { makeStyles } from "@mui/styles";
import { marked } from "marked";
import { Typography } from "@mui/material";
import includes from "lodash/fp/includes";

import { Kyc, PlayerAccount } from "@idefix-backoffice/idefix/types";
import { EditableImage, RenderDocument } from "@idefix-backoffice/idefix/components";

import { ErrorMessageField } from "../formik-fields/ErrorMessageField";
import { ButtonGroupField } from "../formik-fields/ButtonGroupField";
import { DatePickerField } from "../formik-fields/DatePickerField";
import { SelectField } from "../formik-fields/SelectField";
import { MoneyField } from "../formik-fields/MoneyField";

const TYPE_BUTTONS = [
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

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg"];

const useStyles = makeStyles({
  photoContainer: {
    maxWidth: 600
  },
  pdfPhoto: {
    maxWidth: 1000,
    maxHeight: 600,
    height: 600
  },
  markdownPreview: {
    maxHeight: 300,
    borderWidth: "1px",
    borderStyle: "dotted",
    borderColor: "rgba(0, 0, 0, 0.15)",
    borderRadius: "0.25rem",
    overflowY: "auto"
  }
});

interface Props {
  formikProps: FormikProps<Kyc>;
  document: Kyc;
  accounts: PlayerAccount[];
  onEditImage: (prevPhotoId: string, newImage: any, documentId: number) => void;
}

const KycProcessForm = ({ formikProps, document, accounts, onEditImage }: Props) => {
  const classes = useStyles();
  const {
    setFieldValue,
    values: { documentType }
  } = formikProps;

  const onChangeDocumentType = useCallback(
    (newValue: string) => {
      if (newValue === "identification" || newValue === "utility_bill") {
        setFieldValue("accountId", null);
      }

      if (newValue === "payment_method") {
        setFieldValue("expiryDate", null);
        setFieldValue("fields.incomeType", null);
        setFieldValue("fields.incomeMonthlyAmount", null);
      }

      if (newValue === "other" || newValue === "source_of_wealth") {
        setFieldValue("expiryDate", null);
        setFieldValue("accountId", null);
        setFieldValue("fields.incomeType", null);
        setFieldValue("fields.incomeMonthlyAmount", null);
      }
    },
    [setFieldValue]
  );

  const documentExtension = document && document.name && document.name.split(".").pop();

  return (
    <Form>
      <Typography variant="subtitle2">KYC Process</Typography>
      <Field component={ErrorMessageField} />
      <Box display="flex" flexDirection="column" mt={3}>
        {document.photoId && (
          <Box>
            {includes(documentExtension, IMAGE_EXTENSIONS) && (
              <EditableImage
                src={`/api/v1/photos/${document.photoId}`}
                documentId={document.id}
                photoId={document.photoId}
                onEditImage={onEditImage}
              />
            )}
            {!includes(documentExtension, IMAGE_EXTENSIONS) && (
              <Box mt={2}>
                <RenderDocument document={document} />
              </Box>
            )}
            <i>{document.name}</i>
          </Box>
        )}

        {document.content && (
          <Box mt={3} className={classes.markdownPreview}>
            <div dangerouslySetInnerHTML={{ __html: marked(document.content) }} />
          </Box>
        )}

        <Box mt={3}>
          {!documentType && <b>Choose document type: </b>}
          <Field
            name="documentType"
            component={ButtonGroupField}
            buttons={TYPE_BUTTONS}
            onClick={onChangeDocumentType}
          />
        </Box>

        {documentType && documentType !== "other" && documentType !== "payment_method" && (
          <Box alignSelf="flex-start" width="330px">
            <Field name="expiryDate" label="Enter document expiry date if applicable" component={DatePickerField} />
          </Box>
        )}

        {documentType && documentType !== "other" && documentType === "source_of_wealth" && (
          <Box alignSelf="flex-start" width="330px">
            <Field name="fields.incomeType" label="Choose income type if applicable" fullWidth component={SelectField}>
              <MenuItem value="">» Select income type</MenuItem>
              {INCOME_TYPE.map(type => (
                <MenuItem key={type.key} value={type.key}>
                  {type.label}
                </MenuItem>
              ))}
            </Field>

            <Field
              name="fields.incomeMonthlyAmount"
              fullWidth
              label="Enter monthly income amount if applicable"
              component={MoneyField}
              margin="normal"
            />
          </Box>
        )}

        {documentType && documentType === "payment_method" && (
          <Box alignSelf="flex-start" width="330px">
            <Field name="accountId" label="Choose payment account for this document" fullWidth component={SelectField}>
              <MenuItem value="new">» Add new account</MenuItem>
              {accounts &&
                accounts.map(account => (
                  <MenuItem key={account.id} value={account.id}>{`${account.method} - ${account.account} (${
                    account.kycChecked ? "Verified" : "Not verified"
                  })`}</MenuItem>
                ))}
            </Field>
          </Box>
        )}
      </Box>
    </Form>
  );
};

export { KycProcessForm };
