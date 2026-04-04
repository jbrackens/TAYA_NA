import React, { memo, ReactNode, useCallback, useEffect } from "react";
import { Field, FieldArray, FieldArrayRenderProps, Form, FormikProps } from "formik";
import findIndex from "lodash/findIndex";
import Box from "@material-ui/core/Box";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import Toggle from "../formik-fields/ToggleField";
import TextField from "../formik-fields/TextField";
import MoneyField from "../formik-fields/MoneyField";
import SelectField from "../formik-fields/SelectField";
import AutoCompleteField from "../formik-fields/AutoCompleteField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import Typography from "@material-ui/core/Typography";
import {
  validateCountry,
  validateMaxDeposit,
  validateMaxWithdrawal,
  validateMinDeposit,
  validateMinWithdrawal,
} from "./";
import { BrandInit, CountrySettings, Currency } from "app/types";

interface TabPanelProps {
  children: ReactNode;
  value: string | number;
  index: string | number;
}

const TabPanel = ({ children, value, index, ...other }: TabPanelProps) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`simple-tabpanel-${index}`}
    aria-labelledby={`simple-tab-${index}`}
    {...other}
  >
    {value === index && <Box mt={2}>{children}</Box>}
  </div>
);

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
    showWithdrawals,
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
      event => {
        const isChecked = event.target.checked;

        if (isChecked) {
          push({
            brandId: brandId,
            id: currencyId,
            minDeposit: 0,
            maxDeposit: 0,
            minWithdrawal: 0,
            maxWithdrawal: 0,
            maxPendingDeposits: null,
          });
        } else {
          remove(index);
        }
      },
      [brandId, currencyId, index, push, remove],
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
  },
);

interface Props extends FormikProps<any> {
  values: any;
  brands: BrandInit[] | undefined;
  countries: CountrySettings[] | undefined;
  currencies: Currency[] | undefined;
  selectedBrand: string;
  onSelectBrand: (e: any, value: any) => void;
}

const ProviderDetailsForm = ({
  values,
  brands,
  countries = [],
  currencies = [],
  selectedBrand,
  onSelectBrand,
  ...rest
}: Props) => {
  return (
    <Box component={Form} display="flex" flexDirection="column" width="570px" height="800px" padding={2}>
      <Field component={ErrorMessageField} />
      <Field name="deposits" component={Toggle} label="Deposits Active" />
      <Field name="withdrawals" component={Toggle} label="Withdrawal Active" />
      <Field name="active" component={Toggle} label="Active" />
      <Field name="priority" component={TextField} label="Priority" />

      <Tabs
        style={{ marginLeft: -40, marginRight: -40 }}
        value={selectedBrand}
        onChange={onSelectBrand}
        indicatorColor="primary"
        textColor="primary"
        variant="scrollable"
        scrollButtons="auto"
      >
        {brands?.map(({ id, name }) => (
          <Tab key={id} label={name} value={id} style={{ minWidth: 80 }} />
        ))}
      </Tabs>
      {brands?.map(({ id: brandId }) => (
        <TabPanel key={brandId} value={selectedBrand} index={brandId}>
          <Box mt={2}>
            <Field name="blockCountries" component={SelectField}>
              <MenuItem value={"false"}>Included</MenuItem>
              <MenuItem value={"true"}>Excluded</MenuItem>
            </Field>
          </Box>
          <Box mt={2}>
            <Field
              validate={(value: string[]) => validateCountry(value, values.blockCountries)}
              name={`brands.${brandId}.selectedCountries`}
              label="Countries"
              placeholder="Search Country"
              options={countries}
              optionsConfig={{ text: "name", value: "id" }}
              component={AutoCompleteField}
              isDisabled={rest.isSubmitting}
              isMulti={true}
            />
          </Box>
          <FieldArray name={`brands.${brandId}.selectedCurrencies`}>
            {fieldArrayProps => (
              <Box mt={3} mb={2}>
                <Typography>Currencies</Typography>
                {currencies.map(({ id }) => {
                  const { selectedCurrencies } = values.brands[selectedBrand];
                  const index = findIndex(selectedCurrencies, (obj: Currency) => obj.id === id);

                  return (
                    <CurrencyCard
                      key={id}
                      index={index}
                      setFieldValue={rest.setFieldValue}
                      selectedCurrencies={selectedCurrencies}
                      currencyId={id}
                      brandId={brandId}
                      showDeposits={values.deposits}
                      showWithdrawals={values.withdrawals}
                      {...fieldArrayProps}
                    />
                  );
                })}
              </Box>
            )}
          </FieldArray>
        </TabPanel>
      ))}
    </Box>
  );
};
export default ProviderDetailsForm;
