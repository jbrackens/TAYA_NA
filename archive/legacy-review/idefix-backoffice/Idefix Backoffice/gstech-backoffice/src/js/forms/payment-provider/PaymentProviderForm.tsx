import React, { useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Field, Form, Formik } from "formik";
import pick from "lodash/fp/pick";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Toggle from "../formik-fields/ToggleField";
import { updatePaymentProviders } from "../../modules/settings/settingsSlice";
import { PaymentMethodProvider } from "app/types";

interface Props {
  paymentMethodProviders: PaymentMethodProvider;
}

const PaymentProviderForm = ({ paymentMethodProviders }: Props) => {
  const dispatch = useDispatch();

  const handleSubmit = useCallback(
    (values, formikActions) => {
      dispatch(updatePaymentProviders({ id: paymentMethodProviders.id, values, formikActions }));
    },
    [dispatch, paymentMethodProviders],
  );

  const initialValues = useMemo(
    () => pick(["active", "requireVerification", "allowAutoVerification", "highRisk"], paymentMethodProviders),
    [paymentMethodProviders],
  );

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit} enableReinitialize>
      {({ isSubmitting }) => (
        <Box component={Form} display="flex" flexDirection="column">
          <Box display="flex" flexDirection="column" width="480px">
            <Field name="active" component={Toggle} label="Active" />
            <Field name="requireVerification" component={Toggle} label="Require Verification" />
            <Field name="allowAutoVerification" component={Toggle} label="Allow Auto Verification" />
            <Field name="highRisk" component={Toggle} label="High risk" />
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

export default PaymentProviderForm;
