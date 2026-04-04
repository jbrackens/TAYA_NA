import React, { useCallback } from "react";
import { Field, Form, FormikProps } from "formik";
import MoneyField from "../formik-fields/MoneyField";
import SelectField from "../formik-fields/SelectField";
import DatePicker from "../formik-fields/DatePickerField";
import ErrorMessageField from "../formik-fields/ErrorMessageField";
import MenuItem from "@material-ui/core/MenuItem";
import Box from "@material-ui/core/Box";
import { FormValues } from "../../dialogs/credit-bonus";

interface Props {
  bonuses: { id: string; title: string }[];
  formikProps: FormikProps<FormValues>;
}

const CreditBonusForm = ({ bonuses, formikProps }: Props) => {
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
      <Field name="expires" label="Expires" allowPast={false} component={DatePicker} />
    </Box>
  );
};

export default CreditBonusForm;
