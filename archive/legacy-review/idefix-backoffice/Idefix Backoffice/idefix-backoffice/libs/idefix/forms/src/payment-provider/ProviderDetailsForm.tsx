import React, { FC } from "react";
import { Field, FieldArray, Form, FormikProps } from "formik";
import findIndex from "lodash/findIndex";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";

import { BrandInit, CountrySettings, Currency } from "@idefix-backoffice/idefix/types";

import { ToggleField } from "../formik-fields/ToggleField";
import { TextField } from "../formik-fields/TextField";
import { SelectField } from "../formik-fields/SelectField";
import { AutoCompleteField } from "../formik-fields/AutoCompleteField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";
import { TabPanel } from "./components/TabPanel";
import { CurrencyCard } from "./components/CurrencyCard";
import { validateCountry } from "./validationSchema";

interface Props extends FormikProps<any> {
  values: any;
  brands: BrandInit[] | undefined;
  countries: CountrySettings[] | undefined;
  currencies: Currency[] | undefined;
  selectedBrand: string;
  onSelectBrand: (e: any, value: any) => void;
}

const ProviderDetailsForm: FC<Props> = ({
  values,
  brands,
  countries = [],
  currencies = [],
  selectedBrand,
  onSelectBrand,
  ...rest
}) => {
  return (
    <Box component={Form} display="flex" flexDirection="column" width="570px" height="800px" padding={2}>
      <Field component={ErrorMessageField} />
      <Field name="deposits" component={ToggleField} label="Deposits Active" />
      <Field name="withdrawals" component={ToggleField} label="Withdrawal Active" />
      <Field name="active" component={ToggleField} label="Active" />
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
export { ProviderDetailsForm };
