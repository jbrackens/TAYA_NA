import React from "react";
import { Field, Form } from "formik";
import Box from "@material-ui/core/Box";
import Toggle from "../formik-fields/ToggleField";
import AutoCompleteField from "../formik-fields/AutoCompleteField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import { CountrySettings } from "app/types";

interface Props {
  countries: CountrySettings[];
}

const EditGameManufacturerForm = ({ countries }: Props) => (
  <Box component={Form} display="flex" flexDirection="column" minWidth={550} height={480}>
    <Field component={ErrorMessageField} />
    <Field name="active" label="Active" component={Toggle} type="checkbox" />
    <Box mt={2}>
      <Field
        name="blockedCountries"
        label="Blocked Countries"
        placeholder="Search Country"
        options={countries}
        optionsConfig={{ text: "name", value: "id" }}
        component={AutoCompleteField}
        isMulti={true}
      />
    </Box>
  </Box>
);

export default EditGameManufacturerForm;
