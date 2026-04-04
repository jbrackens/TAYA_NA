import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

export const fetchDetails = (paymentProviderId: number) => async (dispatch: AppDispatch) => {
  try {
    const providerDetails = await api.settings.getPaymentProviderDetails(paymentProviderId);
    dispatch(dialogsSlice.changeMeta({ providerDetails }));
  } catch (error) {
    console.log(error);
  }
};

export const save =
  ({ id, ...values }: any, formikActions: FormikHelpers<any>) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.settings.updatePaymentProviderDetails(id, values);
      dispatch(dialogsSlice.closeDialog(DIALOG.PAYMENT_PROVIDER_DETAILS));
    } catch (error) {
      formikActions.setFieldError("general", error.message);
      formikActions.setSubmitting(false);
    }
  };
