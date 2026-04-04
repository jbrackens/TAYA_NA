import React, { FC, useCallback } from "react";
import { Field, Form, FormikProps } from "formik";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";

import { MoneyField } from "../formik-fields/MoneyField";
import { SelectField } from "../formik-fields/SelectField";
import { DatePickerField } from "../formik-fields/DatePickerField";
import { ErrorMessageField } from "../formik-fields/ErrorMessageField";
import { CreditBonusFormValues } from "./types";

interface Props {
  bonuses: { id: string; title: string }[];
  formikProps: FormikProps<CreditBonusFormValues>;
}

const CreditBonusForm: FC<Props> = ({ bonuses, formikProps }) => {
  const handleSetDefaultExpiryDate = useCallback(() => {
    formikProps.setFieldValue("expires", null);
  }, [formikProps]);

  return (
    <Box component={Form} display="flex" flexDirection="column" minWidth="400px">
      <Field component={ErrorMessageField} />
      <Field name="bonus" label="Bonus" component={SelectField}>
        {bonuses &&
          bonuses.map(({ id, title }, index) => (
            <MenuItem key={`${id}${index}`} value={id}>
              <Box onClick={() => handleSetDefaultExpiryDate()} width={1}>
                {title}
              </Box>
            </MenuItem>
          ))}
      </Field>
      <Field name="amount" label="Bonus amount" component={MoneyField} />
      <Field name="expires" label="Expires" allowPast={false} component={DatePickerField} />
    </Box>
  );
};

export { CreditBonusForm };
