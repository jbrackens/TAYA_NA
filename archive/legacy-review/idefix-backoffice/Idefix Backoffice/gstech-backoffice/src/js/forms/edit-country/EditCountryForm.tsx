import React from "react";
import { Form, Field } from "formik";
import Box from "@material-ui/core/Box";
import FormControl from "@material-ui/core/FormControl";
import FormHelperText from "@material-ui/core/FormHelperText";
import MenuItem from "@material-ui/core/MenuItem";
import { useFormikContext } from "formik";
import TextField from "../formik-fields/TextField";
import Toggle from "../formik-fields/ToggleField";
import SelectField from "../formik-fields/SelectField";
import MoneyField from "../formik-fields/MoneyField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import { PLAYER_RISK_PROFILE } from "../../core/constants";

export interface EditCountryProps {
  brandId?: string;
}

const EditCountry = ({ brandId }: EditCountryProps) => {
  const { initialValues, values } = useFormikContext<any>();

  const riskProfileModified = initialValues.riskProfile !== values.riskProfile;

  return (
    <Box component={Form} display="flex" flexDirection="column" minWidth={400}>
      <Field component={ErrorMessageField} />
      <Field name="id" label="Country code" component={TextField} disabled />
      <Field name="name" label="Name" component={TextField} disabled />
      <Field name="minimumAge" label="Minimum registration age" component={TextField} />
      <Field name="registrationAllowed" label="Registration allowed" component={Toggle} type="checkbox" />
      <Field name="blocked" label="Blocked" component={Toggle} type="checkbox" />
      <Field name="loginAllowed" label="Login allowed" component={Toggle} type="checkbox" />
      <FormControl>
        <Field name="riskProfile" id="riskProfile" label="Default risk profile" component={SelectField}>
          {PLAYER_RISK_PROFILE.map(
            ({ value, label }) => (
              <MenuItem value={value} key={value}>
                {label}
              </MenuItem>
            ),
          )}
        </Field>
        {brandId !== "all" && riskProfileModified && (
          <FormHelperText style={{ marginTop: "-15px", marginBottom: "15px" }}>
            Changes to risk profile apply to all brands.
          </FormHelperText>
        )}
      </FormControl>
      <Field name="monthlyIncomeThreshold" label="Monthly income threshold (€)" component={MoneyField} />
    </Box>
  );
};

export default EditCountry;
