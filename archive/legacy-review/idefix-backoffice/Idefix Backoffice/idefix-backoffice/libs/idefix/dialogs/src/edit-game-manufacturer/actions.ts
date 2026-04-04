import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, settingsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { EditManufacturerFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

export const fetchData = (gameManufacturerId: string) => async (dispatch: AppDispatch) => {
  try {
    const manufacturer = await api.settings.getGameManufacturer(gameManufacturerId);
    const countries = await api.settings.getCountries();
    dispatch(dialogsSlice.changeMeta({ manufacturer, countries }));
  } catch (error) {
    // ignore
  }
};

interface Props {
  gameManufacturerId: string;
  gameManufacturerDraft: { active: boolean; blockedCountries: string[] };
  formikActions: FormikHelpers<EditManufacturerFormValues>;
}

export const update =
  ({ gameManufacturerId, gameManufacturerDraft, formikActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.settings.updateGameManufacturer(gameManufacturerId, gameManufacturerDraft);
      dispatch(settingsSlice.fetchGameManufacturers());
      dispatch(dialogsSlice.closeDialog(DIALOG.EDIT_GAME_MANUFACTURER));
    } catch (error) {
      formikActions.setFieldError("general", error.message);
    }
  };
