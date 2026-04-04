import { Box, Paper, FormControlLabel, Switch } from "@mui/material";
import { FieldArrayRenderProps, Field } from "formik";
import { memo, useEffect, useCallback } from "react";

import { MoneyField } from "../../formik-fields/MoneyField";
import {
  validateMinDeposit,
  validateMaxDeposit,
  validateMinWithdrawal,
  validateMaxWithdrawal
} from "../validationSchema";

interface CurrencyCardProps extends FieldArrayRenderProps {
  currencyId: number | string;
  selectedCurrencies: {
    minDeposit: number | string;
    maxDeposit: number | string;
    minWithdrawal: number | string;
    maxWithdrawal: number | string;
  }[];
  setFieldValue: (field: string, value: any) => void;
  brandId: string;
  index: number;
  showDeposits: boolean;
  showWithdrawals: boolean;
}

const CurrencyCard = memo(
  ({
    currencyId,
    selectedCurrencies,
    setFieldValue,
    push,
    remove,
    brandId,
    index,
    showDeposits,
    showWithdrawals
  }: CurrencyCardProps) => {
    const checked = index !== -1;
    const currencies = selectedCurrencies[index] ?? null;

    useEffect(() => {
      if (!showDeposits && checked) {
        selectedCurrencies.forEach(() => {
          setFieldValue(`brands.${brandId}.selectedCurrencies[${index}].minDeposit`, 0);
          setFieldValue(`brands.${brandId}.selectedCurrencies[${index}].maxDeposit`, 0);
        });
      }
    }, [brandId, checked, index, selectedCurrencies, setFieldValue, showDeposits]);

    useEffect(() => {
      if (!showWithdrawals && checked) {
        selectedCurrencies.forEach(() => {
          setFieldValue(`brands.${brandId}.selectedCurrencies[${index}].minWithdrawal`, 0);
          setFieldValue(`brands.${brandId}.selectedCurrencies[${index}].maxWithdrawal`, 0);
        });
      }
    }, [brandId, checked, index, selectedCurrencies, setFieldValue, showDeposits, showWithdrawals]);

    const handleToggleCurrency = useCallback(
      (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        if (checked) {
          push({
            brandId: brandId,
            id: currencyId,
            minDeposit: 0,
            maxDeposit: 0,
            minWithdrawal: 0,
            maxWithdrawal: 0,
            maxPendingDeposits: null
          });
        } else {
          remove(index);
        }
      },
      [brandId, currencyId, index, push, remove]
    );

    return (
      <Box mt={1}>
        <Paper style={{ padding: 16 }}>
          <FormControlLabel
            control={<Switch checked={checked} onChange={handleToggleCurrency} color="primary" />}
            label={currencyId}
          />
          {checked ? (
            <Box display="flex" justifyContent="space-between" flexWrap="wrap">
              {showDeposits && (
                <>
                  <Field
                    validate={(value: string) =>
                      validateMinDeposit({ value, maxDeposit: currencies?.maxDeposit, showDeposits })
                    }
                    name={`brands.${brandId}.selectedCurrencies[${index}].minDeposit`}
                    type="number"
                    label="Min Deposit"
                    margin="normal"
                    component={MoneyField}
                  />
                  <Field
                    validate={(value: string) =>
                      validateMaxDeposit({ value, minDeposit: currencies?.minDeposit, showDeposits })
                    }
                    name={`brands.${brandId}.selectedCurrencies[${index}].maxDeposit`}
                    type="number"
                    label="Max Deposit"
                    margin="normal"
                    component={MoneyField}
                  />
                </>
              )}
              <Field
                name={`brands.${brandId}.selectedCurrencies[${index}].maxPendingDeposits`}
                type="number"
                label="Max Pending Deposits"
                fullWidth
                margin="normal"
                component={MoneyField}
              />
              {showWithdrawals && (
                <>
                  <Field
                    validate={(value: string) =>
                      validateMinWithdrawal({ value, maxWithdrawal: currencies?.maxWithdrawal, showWithdrawals })
                    }
                    name={`brands.${brandId}.selectedCurrencies[${index}].minWithdrawal`}
                    type="number"
                    label="Min Withdrawal"
                    margin="normal"
                    component={MoneyField}
                  />
                  <Field
                    validate={(value: string) =>
                      validateMaxWithdrawal({ value, minWithdrawal: currencies?.minWithdrawal, showWithdrawals })
                    }
                    name={`brands.${brandId}.selectedCurrencies[${index}].maxWithdrawal`}
                    type="number"
                    label="Max Withdrawal"
                    margin="normal"
                    component={MoneyField}
                  />
                </>
              )}
            </Box>
          ) : null}
        </Paper>
      </Box>
    );
  }
);

export { CurrencyCard };
