import React from "react";
import { Field, Form } from "formik";
import MenuItem from "@material-ui/core/MenuItem";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import TextField from "../formik-fields/TextField";
import MoneyField from "../formik-fields/MoneyField";
import SelectField from "../formik-fields/SelectField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import Checkbox from "../formik-fields/CheckboxField";
import { FormValues } from "../../dialogs/add-transaction";
import { PlayerPaymentAccounts, PlayerWithdrawals } from "app/types";

function getWithdrawalFee(value: number, withdrawalFeeConfiguration: PlayerWithdrawals["withdrawalFeeConfiguration"]) {
  const { withdrawalFee: percentage, withdrawalFeeMin, withdrawalFeeMax } = withdrawalFeeConfiguration;
  const fee = (value * percentage) / 100;

  if (percentage > 0 && fee <= withdrawalFeeMin) {
    return Number(withdrawalFeeMin / 100);
  }
  if (fee >= withdrawalFeeMax) {
    return Number(withdrawalFeeMax / 100);
  }

  return Number(fee / 100);
}

interface Props {
  values: FormValues;
  accounts: PlayerPaymentAccounts;
  withdrawals: PlayerWithdrawals | null;
}

const AddTransactionForm = ({ values, accounts: { accounts, description }, withdrawals }: Props) => {
  const withdrawalFeeConfiguration = withdrawals?.withdrawalFeeConfiguration;
  const currencyId = withdrawals?.balance?.currencyId;

  const feeAmount = () => {
    const fee = withdrawalFeeConfiguration && getWithdrawalFee(values.amount, withdrawalFeeConfiguration);
    return fee ? (
      <Typography>
        Fee: {fee} {currencyId}
      </Typography>
    ) : null;
  };

  return (
    <Box component={Form} display="flex" flexDirection="column" width="400px">
      <Field component={ErrorMessageField} />
      <Field name="type" label="Type" component={SelectField} fullWidth>
        <MenuItem value="withdraw">Withdrawal</MenuItem>
        <MenuItem value="correction">Correction</MenuItem>
        <MenuItem value="compensation">Compensation</MenuItem>
      </Field>
      {values.type === "withdraw" && (
        <>
          <Typography variant="body2">{description}</Typography>
          <Field name="accountId" label="Account" component={SelectField} fullWidth>
            {accounts
              .filter(account => account.allowWithdrawals)
              .map(account => (
                <MenuItem value={account.id} key={account.id}>
                  {account.method} - {account.account} ({account.kycChecked ? "verified" : "not verified"})
                </MenuItem>
              ))}
          </Field>

          <Box mb={2}>
            <Field name="noFee" component={Checkbox} label={<Box component="span">Include withdrawal fee</Box>} />
            {values?.noFee && feeAmount()}
          </Box>
        </>
      )}
      <Field name="amount" label="Amount" component={MoneyField} />
      <Field name="reason" label="Reason" component={TextField} fullWidth multiline rows={2} />
    </Box>
  );
};

export default AddTransactionForm;
