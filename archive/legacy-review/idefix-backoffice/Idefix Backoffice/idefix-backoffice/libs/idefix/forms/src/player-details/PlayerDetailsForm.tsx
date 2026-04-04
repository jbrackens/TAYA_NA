import React from "react";
import { Field, Form, FormikProps } from "formik";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";

import { TextField } from "../formik-fields/TextField";
import { SelectField } from "../formik-fields/SelectField";
import { DatePickerField } from "../formik-fields/DatePickerField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";
import { PlayerDetailsFormValues } from "./types";

interface Props extends FormikProps<PlayerDetailsFormValues> {
  countries: { id: string; name: string }[];
  languages: { id: string; name: string }[];
}

const PlayerDetailsForm = ({ countries, languages, isSubmitting, ...rest }: Props) => {
  return (
    <Box component={Form} display="grid" gridTemplateColumns="repeat(3, 1fr)" gap="8px 24px">
      <Box gridColumn="1 / 4">
        <Field component={ErrorMessageField} />
      </Box>

      <Field name="firstName" label="Name" disabled={isSubmitting} component={TextField} />
      <Field name="lastName" label="Last name" disabled={isSubmitting} component={TextField} />
      <Field name="email" label="Email" disabled={isSubmitting} component={TextField} />
      <Field name="mobilePhone" label="Mobile phone" disabled={isSubmitting} component={TextField} />
      <Field name="placeOfBirth" label="Place of birth" disabled={isSubmitting} component={TextField} />
      <Field name="address" label="Street address" disabled={isSubmitting} component={TextField} />
      <Field name="postCode" label="Postcode" disabled={isSubmitting} component={TextField} />
      <Field name="city" label="City" disabled={isSubmitting} component={TextField} />
      <Field name="dateOfBirth" label="Date of birth" allowPast disabled={isSubmitting} component={DatePickerField} />
      <Field name="nationalId" label="National ID" disabled={isSubmitting} component={TextField} />
      <Field name="nationality" label="Nationality" disabled={isSubmitting} component={SelectField}>
        {countries.map(country => (
          <MenuItem key={country.id} value={country.id}>
            {country.name}
          </MenuItem>
        ))}
      </Field>
      <Field
        id="countryId"
        name="countryId"
        label="Country of residence"
        disabled={isSubmitting}
        component={SelectField}
      >
        {countries.map(country => (
          <MenuItem key={country.id} value={country.id}>
            {country.name}
          </MenuItem>
        ))}
      </Field>
      <Field name="languageId" label="Language" disabled={isSubmitting} component={SelectField}>
        {languages.map(language => (
          <MenuItem key={language.id} value={language.id}>
            {language.name}
          </MenuItem>
        ))}
      </Field>
    </Box>
  );
};

export { PlayerDetailsForm };
