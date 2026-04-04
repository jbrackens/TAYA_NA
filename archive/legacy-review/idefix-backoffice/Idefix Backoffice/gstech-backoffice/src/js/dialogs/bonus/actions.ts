import { CreateBonusRequest, CreateBonusValues, UpdateBonusLimitsRequest } from "app/types";
import { FormikHelpers } from "formik";
import api from "../../core/api";
import { refetchBonuses } from "../../modules/settings";
import { changeMeta, closeDialog } from "../";
import { AppDispatch } from "../../../index";
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
  dispatch(changeMeta(bonusLimits));
  return bonusLimits;
};

export const fetchAvailableBonusLimits = (brandId: string) => async (dispatch: AppDispatch) => {
  const bonusLimits = await api.settings.getAvailableBonusLimits(brandId);
  dispatch(changeMeta(bonusLimits));
  return bonusLimits;
};

export const save =
  (
    { bonusId, brandId, bonusDraft, bonusLimits }: UpdateBonusOptions,
    formikActions: FormikHelpers<CreateBonusValues>,
  ) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.settings.updateBonus(bonusId, bonusDraft);
      await api.settings.updateBonusLimits(bonusId, bonusLimits);
      dispatch(refetchBonuses({ brandId }));
      dispatch(closeDialog("bonus"));
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
      dispatch(refetchBonuses({ brandId }));
      dispatch(closeDialog("bonus"));
    } catch (error) {
      if (error && error.code === "23505") {
        formikActions.setFieldError("general", "Bonus already exist");
      }
      formikActions.resetForm();
      formikActions.setFieldError("general", error.message);
    }
  };
