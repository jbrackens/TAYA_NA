import React, { FC } from "react";
import { Field, Form } from "formik";
import Box from "@material-ui/core/Box";
import { Typography } from "@material-ui/core";
import TextField from "../formik-fields/TextField";
import Toggle from "../formik-fields/ToggleField";
import MoneyField from "../formik-fields/MoneyField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import { BonusLimit, CreateBonusValues } from "app/types";

interface Props {
  bonusLimits: BonusLimit[];
  values: CreateBonusValues;
}

const BonusForm: FC<Props> = ({ bonusLimits, values }) => {
  return (
    <Box component={Form} display="flex" flexDirection="column">
      <Field component={ErrorMessageField} />
      <Field name="name" label="Name" component={TextField} />
      <Field name="active" label="Active" component={Toggle} type="checkbox" />

      <Box display="flex">
        <Box width="50%">
          <Field name="wageringRequirementMultiplier" label="Wagering requirement" component={TextField} />
        </Box>
        <Box width="50%" ml={2}>
          <Field name="daysUntilExpiration" label="Days until expiration" component={TextField} />
        </Box>
      </Box>

      <Field name="creditOnce" label="Allow bonus credition only once per player" component={Toggle} type="checkbox" />
      <Field
        name="depositBonus"
        label="Bonus available on deposit (not campaign bonus)"
        component={Toggle}
        type="checkbox"
      />

      {values.depositBonus && (
        <Box display="flex" flexDirection="column">
          <Field name="depositCountMatch" label="Match to exact deposit count" component={Toggle} type="checkbox" />
          <Box>
            <Field
              name="depositCount"
              label={
                values.depositCountMatch
                  ? "Bonus available only for deposit number"
                  : "Bonus available when deposit number at least"
              }
              component={TextField}
            />
            <Field name="depositMatchPercentage" label="Deposit match %" component={TextField} />
          </Box>
          <Box display="flex" flexDirection="column" mt={3}>
            <Typography>Currencies</Typography>
            <Box mt={2}>
              {bonusLimits.map(({ currencyId }, index) => (
                <Box key={currencyId} display="flex" justifyContent="space-between" mb={2}>
                  <Box>
                    <Field
                      name={`limits[${index}][minAmount]`}
                      component={MoneyField}
                      autoComplete="off"
                      label={`${currencyId} Min`}
                    />
                  </Box>
                  <Box ml={1}>
                    <Field
                      name={`limits[${index}][maxAmount]`}
                      component={MoneyField}
                      autoComplete="off"
                      label={`${currencyId} Max`}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {!values.depositBonus && (
        <Box display="flex" flexDirection="column" mt={3}>
          <Typography>Currencies</Typography>
          <Box mt={2}>
            {bonusLimits.map(({ currencyId }, index) => (
              <Box key={currencyId} mb={2}>
                <Field
                  name={`limits[${index}][minAmount]`}
                  component={MoneyField}
                  autoComplete="off"
                  label={currencyId}
                />
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default BonusForm;
