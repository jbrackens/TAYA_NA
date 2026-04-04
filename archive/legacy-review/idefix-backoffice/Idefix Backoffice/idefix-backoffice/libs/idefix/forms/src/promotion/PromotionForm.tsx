import React, { useCallback } from "react";
import { Field, Form, FormikProps } from "formik";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";

import { GameSettings } from "@idefix-backoffice/idefix/types";

import { TextField } from "../formik-fields/TextField";
import { ToggleField } from "../formik-fields/ToggleField";
import { SelectField } from "../formik-fields/SelectField";
import { MoneyField } from "../formik-fields/MoneyField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";
import { PromotionFormValues } from "./types";

interface Props {
  gameList: GameSettings[];
  formikProps: FormikProps<PromotionFormValues>;
}

const PromotionForm = ({ gameList, formikProps: { values, setFieldValue } }: Props) => {
  const handleChange = useCallback(
    (fieldName: string) => () => {
      switch (fieldName) {
        case "calculateRounds":
          setFieldValue("calculateRounds", !values.calculateRounds);
          setFieldValue("calculateWins", false);
          setFieldValue("calculateWinsRatio", false);
          break;
        case "calculateWins":
          setFieldValue("calculateRounds", false);
          setFieldValue("calculateWins", !values.calculateWins);
          setFieldValue("calculateWinsRatio", false);
          break;
        case "calculateWinsRatio":
          setFieldValue("calculateRounds", false);
          setFieldValue("calculateWins", false);
          setFieldValue("calculateWinsRatio", !values.calculateWinsRatio);
          break;
        default:
          return;
      }
    },
    [setFieldValue, values.calculateRounds, values.calculateWins, values.calculateWinsRatio]
  );

  return (
    <Box component={Form} display="flex" flexDirection="column" width={500}>
      <Field component={ErrorMessageField} />
      <Field name="name" label="Name" component={TextField} />
      <Field name="multiplier" label="Multiplier" component={TextField} />
      <Field name="autoStart" label="AutoStart" component={ToggleField} />
      <Field name="active" label="Active" component={ToggleField} />
      <Field name="allGames" label="All Games" component={ToggleField} />
      {!values.allGames && (
        <Field name="games" label="Selected games" multiple={true} component={SelectField}>
          {gameList.map(({ id, gameId }) => (
            <MenuItem key={id} value={id}>
              {gameId}
            </MenuItem>
          ))}
        </Field>
      )}
      <Field
        name="calculateRounds"
        label="Calculate Rounds"
        onChange={handleChange("calculateRounds")}
        component={ToggleField}
      />
      <Field
        name="calculateWins"
        label="Calculate Wins"
        onChange={handleChange("calculateWins")}
        component={ToggleField}
      />
      <Field
        name="calculateWinsRatio"
        label="Calculate Wins Ratio"
        onChange={handleChange("calculateWinsRatio")}
        component={ToggleField}
      />
      <Field
        name="minimumContribution"
        label="Minimum points per bet required to contribute on promotion"
        min="0"
        max="10000000"
        margin="normal"
        component={MoneyField}
      />
    </Box>
  );
};

export { PromotionForm };
