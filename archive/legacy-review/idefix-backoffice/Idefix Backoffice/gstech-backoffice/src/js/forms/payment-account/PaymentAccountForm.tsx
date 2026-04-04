import React, { useCallback } from "react";
import { Field, FieldArray, Form, FormikProps } from "formik";
import MenuItem from "@material-ui/core/MenuItem";
import Box from "@material-ui/core/Box";
import { Card, CardContent } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { isCanadianBankAccount, isMaskedAccount, isSwedishBankAccount, isProvidedByDirecta24 } from "../validators";
import { convertIBANToBIC } from "../helpers";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import SelectField from "../formik-fields/SelectField";
import TextField from "../formik-fields/TextField";
import Toggle from "../formik-fields/ToggleField";
import DocumentsField from "./DocumentsField";
import { FormValues } from "../../dialogs/view-payment-account";
import { ACCOUNT_IDENTIFIER_LABEL, DIRECTA24_WD_PAYMENT_METHODS } from "../../core/constants";
import { AccountDocument } from "app/types";

const useStyles = makeStyles({
  card: {
    marginTop: 16,
  },
  cardContent: {
    padding: 0,
  },
});

const editableMethods = [
  "BankTransfer",
  "Skrill",
  "Neteller",
  "InteracETransfer",
  "MuchBetter",
  "COMMUNITYBANK",
  "ISX",
  ...DIRECTA24_WD_PAYMENT_METHODS,
];

interface Props {
  formType?: string;
  formikProps: FormikProps<FormValues>;
  disableIconButton?: boolean;
  setDocumentsForRemove?: React.Dispatch<React.SetStateAction<AccountDocument[]>>;
}

const PaymentAccountForm = ({ formikProps, formType, disableIconButton, setDocumentsForRemove }: Props) => {
  const classes = useStyles();
  const { values, setFieldValue } = formikProps;
  const { method, account, parameters } = values;

  const handleAccountChange = useCallback(
    (value: string) => {
      if (method === "BankTransfer" && ((parameters && parameters.bic === "") || !parameters.bic)) {
        const defaultBic = convertIBANToBIC(value);
        setFieldValue("parameters.bic", defaultBic);
      }

      if (
        !isProvidedByDirecta24(method) &&
        (isSwedishBankAccount(account) || isCanadianBankAccount(account) || isMaskedAccount(account))
      ) {
        setFieldValue("parameters.bic", "");
      }
    },
    [account, method, parameters, setFieldValue],
  );

  return (
    <Box component={Form} display="flex" flexDirection="column" minWidth="600px">
      <Field component={ErrorMessageField} />
      <Field name="method" label="Type" disabled={formType === "edit"} component={SelectField}>
        {formType === "edit" ? (
          <MenuItem value={method}>{method}</MenuItem>
        ) : (
          editableMethods.map(method => (
            <MenuItem key={method} value={method}>
              {method}
            </MenuItem>
          ))
        )}
      </Field>
      {method && (
        <Field
          name="account"
          label={ACCOUNT_IDENTIFIER_LABEL[method]}
          disabled={!editableMethods?.includes(method)}
          component={TextField}
          onChange={handleAccountChange}
        />
      )}
      {(method === "BankTransfer" || method === "COMMUNITYBANK") &&
        !isSwedishBankAccount(account) &&
        !isCanadianBankAccount(account) &&
        !isMaskedAccount(account) && <Field name="parameters.bic" label="BIC/Swift" component={TextField} />}
      {isProvidedByDirecta24(method) && (
        <>
          <Field name="parameters.accountType" label="Account Type" component={SelectField}>
            <MenuItem value="C">Checkings</MenuItem>
            <MenuItem value="S">Savings</MenuItem>
          </Field>
          <Field name="parameters.bankCode" label="Bank Code (3-digits)" component={TextField} />
          {method === "BrazilBankWD" && (
            <Field name="parameters.bankBranch" label="Bank Branch" component={TextField} />
          )}
        </>
      )}
      <Field name="kycChecked" label="Account verified" component={Toggle} />
      <Card classes={{ root: classes.card }}>
        <CardContent classes={{ root: classes.cardContent }}>
          <FieldArray name="documents">
            {arrayHelpers => (
              <DocumentsField
                disableIconButton={disableIconButton}
                arrayHelpers={arrayHelpers}
                setDocumentsForRemove={setDocumentsForRemove}
              />
            )}
          </FieldArray>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PaymentAccountForm;
