import api from "../../core/api";
import { changeMeta, closeDialog } from "../";
import { AppDispatch } from "index";
import { FormikHelpers } from "formik";

export const fetchDetails = (paymentProviderId: number) => async (dispatch: AppDispatch) => {
  try {
    const providerDetails = await api.settings.getPaymentProviderDetails(paymentProviderId);
    dispatch(changeMeta({ providerDetails }));
  } catch (error) {
    console.log(error);
  }
};

export const save =
  ({ id, ...values }: any, formikActions: FormikHelpers<any>) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.settings.updatePaymentProviderDetails(id, values);
      dispatch(closeDialog("payment-provider-details"));
    } catch (error) {
      formikActions.setFieldError("general", error.message);
      formikActions.setSubmitting(false);
    }
  };
