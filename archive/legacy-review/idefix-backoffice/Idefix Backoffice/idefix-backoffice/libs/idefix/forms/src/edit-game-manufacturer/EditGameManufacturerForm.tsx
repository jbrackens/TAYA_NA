import React, { FC } from "react";
import { Field, Form } from "formik";
import Box from "@mui/material/Box";

import { CountrySettings } from "@idefix-backoffice/idefix/types";

import { ToggleField } from "../formik-fields/ToggleField";
import { AutoCompleteField } from "../formik-fields/AutoCompleteField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";

interface Props {
  countries: CountrySettings[];
}

const EditGameManufacturerForm: FC<Props> = ({ countries }) => (
  <Box component={Form} display="flex" flexDirection="column" minWidth={550} height={480}>
    <Field component={ErrorMessageField} />
    <Field name="active" label="Active" component={ToggleField} type="checkbox" />
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

export { EditGameManufacturerForm };
