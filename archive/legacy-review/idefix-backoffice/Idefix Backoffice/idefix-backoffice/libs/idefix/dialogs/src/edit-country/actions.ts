import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, settingsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { CountrySettingsDraft, DIALOG } from "@idefix-backoffice/idefix/types";
import { EditCountryFormValues } from "@idefix-backoffice/idefix/forms";

interface Props {
  brandId: string;
  countryId: string;
  countryDraft: CountrySettingsDraft;
  formikActions: FormikHelpers<EditCountryFormValues>;
}

export const save =
  ({ brandId, countryId, countryDraft, formikActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.settings.updateCountry(brandId, countryId, countryDraft);
      dispatch(settingsSlice.fetchCountries({ brandId }));
      dispatch(dialogsSlice.closeDialog(DIALOG.EDIT_COUNTRY));
    } catch (error) {
      formikActions.setFieldError("general", error.message);
    }
  };
