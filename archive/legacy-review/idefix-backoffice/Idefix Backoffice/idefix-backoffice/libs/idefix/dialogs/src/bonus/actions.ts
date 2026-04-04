import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import {
  CreateBonusRequest,
  CreateBonusValues,
  UpdateBonusLimitsRequest,
  DIALOG
} from "@idefix-backoffice/idefix/types";
import { AppDispatch, settingsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";

import { transformError } from "./helpers";

interface CreateBonusOptions {
  brandId: string;
  bonusDraft: CreateBonusRequest;
  bonusLimits: UpdateBonusLimitsRequest;
}

interface UpdateBonusOptions extends CreateBonusOptions {
  bonusId: number;
}

export const fetchBonusLimits = (bonusId: number) => async (dispatch: AppDispatch) => {
  const bonusLimits = await api.settings.getBonusLimits(bonusId);
  dispatch(dialogsSlice.changeMeta(bonusLimits));
  return bonusLimits;
};

export const fetchAvailableBonusLimits = (brandId: string) => async (dispatch: AppDispatch) => {
  const bonusLimits = await api.settings.getAvailableBonusLimits(brandId);
  dispatch(dialogsSlice.changeMeta(bonusLimits));
  return bonusLimits;
};

export const save =
  (
    { bonusId, brandId, bonusDraft, bonusLimits }: UpdateBonusOptions,
    formikActions: FormikHelpers<CreateBonusValues>
  ) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.settings.updateBonus(bonusId, bonusDraft);
      await api.settings.updateBonusLimits(bonusId, bonusLimits);
      dispatch(settingsSlice.fetchBonuses({ brandId }));
      dispatch(dialogsSlice.closeDialog(DIALOG.BONUS));
    } catch (error) {
      transformError(error);
      formikActions.resetForm();
      formikActions.setFieldError("general", error.message);
    }
  };

export const create =
  ({ brandId, bonusDraft, bonusLimits }: CreateBonusOptions, formikActions: FormikHelpers<CreateBonusValues>) =>
  async (dispatch: AppDispatch) => {
    try {
      const { id } = await api.settings.createBonus(brandId, bonusDraft);
      await api.settings.updateBonusLimits(id, bonusLimits);
      dispatch(settingsSlice.fetchBonuses({ brandId }));
      dispatch(dialogsSlice.closeDialog(DIALOG.BONUS));
    } catch (error) {
      if (error && error.code === "23505") {
        formikActions.setFieldError("general", "Bonus already exist");
      }
      formikActions.resetForm();
      formikActions.setFieldError("general", error.message);
    }
  };
