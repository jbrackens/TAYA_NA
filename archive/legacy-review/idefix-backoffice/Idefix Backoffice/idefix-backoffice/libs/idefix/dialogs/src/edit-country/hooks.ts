import { FormikHelpers } from "formik";
import pick from "lodash/fp/pick";
import { useCallback, useMemo } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { CountrySettings, DIALOG } from "@idefix-backoffice/idefix/types";
import { EditCountryFormValues } from "@idefix-backoffice/idefix/forms";

import { save } from "./actions";

const useEditCountry = (country: CountrySettings) => {
  const dispatch = useAppDispatch();

  const handleSave = useCallback(
    (values: EditCountryFormValues, formikActions: FormikHelpers<EditCountryFormValues>) => {
      const { minimumAge, registrationAllowed, loginAllowed, blocked, riskProfile, monthlyIncomeThreshold } = values;
      dispatch(
        save({
          brandId: country.brandId,
          countryId: country.id,
          countryDraft: {
            minimumAge,
            registrationAllowed: !!registrationAllowed,
            loginAllowed: !!loginAllowed,
            blocked,
            riskProfile,
            monthlyIncomeThreshold
          },
          formikActions
        })
      );
    },
    [country.brandId, country.id, dispatch]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.EDIT_COUNTRY)), [dispatch]);

  const initialValues: EditCountryFormValues = useMemo(
    () => ({
      ...pick(["id", "name", "minimumAge", "registrationAllowed", "loginAllowed", "blocked", "riskProfile"], country),
      monthlyIncomeThreshold: country && country.monthlyIncomeThreshold ? country.monthlyIncomeThreshold : null
    }),
    [country]
  );

  return { handleSave, handleClose, initialValues };
};

export { useEditCountry };
