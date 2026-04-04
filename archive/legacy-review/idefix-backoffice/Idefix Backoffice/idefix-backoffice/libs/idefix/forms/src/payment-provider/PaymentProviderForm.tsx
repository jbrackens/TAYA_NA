import React, { FC, useCallback, useMemo } from "react";
import { Field, Form, Formik, FormikHelpers } from "formik";
import pick from "lodash/fp/pick";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import { PaymentMethodProvider } from "@idefix-backoffice/idefix/types";
import { settingsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";

import { ToggleField } from "../formik-fields/ToggleField";
import { PaymentProviderFormValues } from "./types";

interface Props {
  paymentMethodProviders: PaymentMethodProvider;
}

const PaymentProviderForm: FC<Props> = ({ paymentMethodProviders }) => {
  const dispatch = useAppDispatch();

  const handleSubmit = useCallback(
    (values: PaymentProviderFormValues, formikActions: FormikHelpers<PaymentProviderFormValues>) => {
      dispatch(settingsSlice.updatePaymentProviders({ id: paymentMethodProviders.id, values, formikActions }));
    },
    [dispatch, paymentMethodProviders]
  );

  const initialValues = useMemo(
    () => pick(["active", "requireVerification", "allowAutoVerification", "highRisk"], paymentMethodProviders),
    [paymentMethodProviders]
  );

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit} enableReinitialize>
      {({ isSubmitting }) => (
        <Box component={Form} display="flex" flexDirection="column">
          <Box display="flex" flexDirection="column" width="480px">
            <Field name="active" component={ToggleField} label="Active" />
            <Field name="requireVerification" component={ToggleField} label="Require Verification" />
            <Field name="allowAutoVerification" component={ToggleField} label="Allow Auto Verification" />
            <Field name="highRisk" component={ToggleField} label="High risk" />
          </Box>

          <Box mt={2} alignSelf="flex-start">
            <Button type="submit" disabled={isSubmitting} color="primary">
              Save
            </Button>
          </Box>
        </Box>
      )}
    </Formik>
  );
};

export { PaymentProviderForm };
