import api from "../../core/api";
import { refetchCountries } from "../../modules/settings";
import { closeDialog } from "../";
import { AppDispatch } from "../../../index";
import { FormValues } from "./index";
import { FormikHelpers } from "formik";
import { CountrySettingsDraft } from "app/types";

interface Props {
  brandId: string;
  countryId: string;
  countryDraft: CountrySettingsDraft;
  formikActions: FormikHelpers<FormValues>;
}

export const save = ({ brandId, countryId, countryDraft, formikActions }: Props) => async (dispatch: AppDispatch) => {
  try {
    await api.settings.updateCountry(brandId, countryId, countryDraft);
    dispatch(refetchCountries({ brandId }));
    dispatch(closeDialog("edit-country"));
  } catch (error) {
    formikActions.setFieldError("general", error.message);
  }
};
