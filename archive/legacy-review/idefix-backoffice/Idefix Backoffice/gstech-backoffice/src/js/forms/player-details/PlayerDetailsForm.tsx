import React, { useMemo } from "react";
import { Field, Form, FormikProps } from "formik";
import Box from "@material-ui/core/Box";
import MenuItem from "@material-ui/core/MenuItem";
import { isDate } from "lodash";
import moment from "moment";
import TextField from "../formik-fields/TextField";
import SelectField from "../formik-fields/SelectField";
import DatePicker from "../formik-fields/DatePickerField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import { PlayerWithUpdate } from "app/types";
import TooltipCard from "../../core/components/tooltip-card/ToolTipCard";

interface Props extends FormikProps<PlayerWithUpdate> {
  isEditing: boolean;
  countries: { id: string; name: string }[];
  languages: { id: string; name: string }[];
}

const keys = {
  firstName: "Name",
  lastName: "Last name",
  email: "Email",
  mobilePhone: "Mobile phone",
  placeOfBirth: "Place of birth",
  address: "Street address",
  postCode: "Postcode",
  city: "City",
  dateOfBirth: "Date of birth",
  nationalId: "National ID",
  nationality: "Nationality",
  countryId: "Country of residence",
  languageId: "Language",
};

function getValue(value: any) {
  if (typeof value === "string") return value;
  if (value === null) return "";
  if (isDate(value)) return moment(value).format("DD.MM.yyyy");
  return value.toString();
}

const PlayerDetails = ({ isEditing, countries, languages, ...rest }: Props) => {
  const placeholders = useMemo(() => {
    return rest.values ? (
      <Box component={Form} display="grid" gridTemplateColumns="repeat(3, 1fr)" gridGap="8px 24px">
        {Object.entries(rest.values).map(([key, value]) => (
          <TooltipCard
            key={key}
            // @ts-ignore
            label={keys[key]}
          >
            {getValue(value) || "Empty"}
          </TooltipCard>
        ))}
      </Box>
    ) : null;
  }, [rest.values]);

  if (!isEditing) {
    return placeholders;
  }

  return (
    <Box component={Form} display="grid" gridTemplateColumns="repeat(3, 1fr)" gridGap="8px 24px">
      <Box gridColumn="1 / 4">
        <Field component={ErrorMessageField} />
      </Box>

      <Field name="firstName" label="Name" disabled={!isEditing} component={TextField} />
      <Field name="lastName" label="Last name" disabled={!isEditing} component={TextField} />
      <Field name="address" label="Street address" disabled={!isEditing} component={TextField} />
      <Field name="postCode" label="Postcode" disabled={!isEditing} component={TextField} />
      <Field name="city" label="City" disabled={!isEditing} component={TextField} />
      <Field name="email" label="Email address" disabled={!isEditing} component={TextField} />
      <Field name="mobilePhone" label="Mobile phone" disabled={!isEditing} component={TextField} />
      <Field id="countryId" name="countryId" label="Country of residence" disabled={!isEditing} component={SelectField}>
        {countries.map(country => (
          <MenuItem key={country.id} value={country.id}>
            {country.name}
          </MenuItem>
        ))}
      </Field>
      <Field name="languageId" label="Language" disabled={!isEditing} component={SelectField}>
        {languages.map(language => (
          <MenuItem key={language.id} value={language.id}>
            {language.name}
          </MenuItem>
        ))}
      </Field>
      <Field name="nationalId" label="National ID" disabled={!isEditing} component={TextField} />
      <Field name="nationality" label="Nationality" disabled={!isEditing} component={SelectField}>
        {countries.map(country => (
          <MenuItem key={country.id} value={country.id}>
            {country.name}
          </MenuItem>
        ))}
      </Field>
      <Field name="placeOfBirth" label="Place of birth" disabled={!isEditing} component={TextField} />
      <Field name="dateOfBirth" label="Date of birth" disabled={!isEditing} component={DatePicker} />
    </Box>
  );
};

export default PlayerDetails;
