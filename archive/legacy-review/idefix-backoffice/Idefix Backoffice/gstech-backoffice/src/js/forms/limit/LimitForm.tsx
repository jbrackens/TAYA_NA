import React from "react";
import { Field, Form } from "formik";
import Box from "@material-ui/core/Box";
import CheckboxField from "../formik-fields/CheckboxField";
import SelectDurationField from "./SelectDurationField";
import SelectTimePeriodField from "./SelectTimePeriodField";
import SelectMaximumPlaytimeField from "./SelectMaximumPlaytimeField";
import TextField from "../formik-fields/TextField";
import MoneyField from "../formik-fields/MoneyField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import { validateLimit, validateReason } from "./validation";
import { LimitType } from "app/types";

interface Props {
  dialog?: string;
  type: LimitType;
  limitError?: string | boolean;
  error?: string | boolean;
}

const LimitForm = (props: Props) => {
  const { dialog, type, limitError, error } = props;
  return (
    <Box component={Form} display="flex" flexDirection="column" alignItems="stretch" minWidth="450px">
      <Field component={ErrorMessageField} />
      {error && (
        <Box component="span" fontSize={14} color="#f44336">
          {error}
        </Box>
      )}
      {limitError && !error && (
        <Box component="span" fontSize={14} color="#f44336">
          {limitError}
        </Box>
      )}

      {["selfExclusion", "timeout"].includes(type) && <SelectDurationField />}

      {["deposit", "loss", "bet"].includes(type) && (
        <Box>
          <SelectTimePeriodField />
          <Field
            name="limit"
            label={`${type} limit`}
            validate={validateLimit}
            min="0"
            max="10000000"
            fullWidth
            component={MoneyField}
          />
          <br />
          {dialog !== "raise-limit" && <SelectDurationField />}
        </Box>
      )}

      {type === "sessionLength" && (
        <Box>
          <SelectMaximumPlaytimeField />
          {dialog !== "raise-limit" && <SelectDurationField />}
        </Box>
      )}
      <Field name="isInternal" component={CheckboxField} label="Player cancellable" />
      <Field
        name="reason"
        label="Reason"
        validate={validateReason}
        multiline
        fullWidth
        rows={3}
        component={TextField}
      />
    </Box>
  );
};

export default LimitForm;
