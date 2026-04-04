import api from "../../core/api";
import { fetchGameManufacturers } from "../../modules/settings/settingsSlice";
import { changeMeta, closeDialog } from "../";
import { AppDispatch } from "../../../index";
import { FormikHelpers } from "formik";
import { FormValues } from "./index";

export const fetchData = (gameManufacturerId: string) => async (dispatch: AppDispatch) => {
  try {
    const manufacturer = await api.settings.getGameManufacturer(gameManufacturerId);
    const countries = await api.settings.getCountries();
    dispatch(changeMeta({ manufacturer, countries }));
  } catch (error) {
    // ignore
  }
};

interface Props {
  gameManufacturerId: string;
  gameManufacturerDraft: { active: boolean; blockedCountries: string[] };
  formikActions: FormikHelpers<FormValues>;
}

export const update = ({ gameManufacturerId, gameManufacturerDraft, formikActions }: Props) => async (
  dispatch: AppDispatch,
) => {
  try {
    await api.settings.updateGameManufacturer(gameManufacturerId, gameManufacturerDraft);
    dispatch(fetchGameManufacturers());
    dispatch(closeDialog("edit-game-manufacturer"));
  } catch (error) {
    formikActions.setFieldError("general", error.message);
  }
};
