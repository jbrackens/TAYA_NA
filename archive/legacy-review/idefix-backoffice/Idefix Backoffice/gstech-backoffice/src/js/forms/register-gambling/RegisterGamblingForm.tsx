import React from "react";
import { Field, Form } from "formik";
import Box from "@material-ui/core/Box";
import TextField from "../formik-fields/TextField";
import DatePicker from "../formik-fields/DatePickerField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import SelectField from "../formik-fields/SelectField";
import MenuItem from "@material-ui/core/MenuItem";
import { CountrySettings } from "app/types";

interface Props {
  countries: CountrySettings[] | undefined;
}

export const RegisterGamblingForm = ({ countries }: Props) => (
  <Box component={Form} display="flex" flexDirection="column" minWidth="400px">
    <Field component={ErrorMessageField} />

    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
      <Box width="50%">
        <Field name="firstName" label="First Name" component={TextField} />
      </Box>
      <Box ml={2} width="50%">
        <Field name="lastName" label="Last Name" component={TextField} />
      </Box>
    </Box>

    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Box width="50%">
        <Field name="nationalId" label="National Id" component={TextField} />
      </Box>
      <Box ml={2} width="50%">
        <Field name="dateOfBirth" label="Day of Birth" disableFuture component={DatePicker} />
      </Box>
    </Box>

    <Field name="mobilePhone" label="Phone Number" component={TextField} />
    <Field name="email" label="Email" component={TextField} />
    <Field name="address" label="Street Address" component={TextField} />

    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Box width="50%">
        <Field name="postCode" label="Postcode" component={TextField} />
      </Box>
      <Box ml={2} width="50%">
        <Field name="city" label="City" component={TextField} />
      </Box>
    </Box>

    <Field name="countryId" label="Country" component={SelectField}>
      {countries?.map(country => (
        <MenuItem key={country.id} value={country.id}>
          {country.name}
        </MenuItem>
      ))}
    </Field>

    <Field name="note" label="Note" component={TextField} multiline rows={4} />
  </Box>
);
