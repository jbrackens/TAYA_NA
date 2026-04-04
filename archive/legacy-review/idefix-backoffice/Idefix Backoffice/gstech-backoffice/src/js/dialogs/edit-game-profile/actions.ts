import api from "../../core/api";
import { refetchGameProfiles } from "../../modules/settings";
import { closeDialog } from "../";
import { RiskProfile } from "app/types";
import { FormikHelpers } from "formik";
import { FormValues } from "./";
import { AppDispatch } from "../../../index";

interface Props {
  gameProfileId: number;
  gameProfileDraft: { name: string; brandId: string; wageringMultiplier: number; riskProfile: RiskProfile };
  formActions: FormikHelpers<FormValues>;
}

export const save = ({ gameProfileId, gameProfileDraft, formActions }: Props) => async (dispatch: AppDispatch) => {
  try {
    await api.settings.updateGameProfile(gameProfileId, gameProfileDraft);
    dispatch(refetchGameProfiles({ brandId: gameProfileDraft.brandId }));
    dispatch(closeDialog("edit-game-profile"));
  } catch (error) {
    formActions.setFieldError("general", error.message);
  }
};
