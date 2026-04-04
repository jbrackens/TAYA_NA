import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, settingsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { RiskProfile, DIALOG } from "@idefix-backoffice/idefix/types";
import { GameProfileFormValues } from "@idefix-backoffice/idefix/forms";

interface Props {
  gameProfileId: number;
  gameProfileDraft: { name: string; brandId: string; wageringMultiplier: number; riskProfile: RiskProfile };
  formActions: FormikHelpers<GameProfileFormValues>;
}

export const save =
  ({ gameProfileId, gameProfileDraft, formActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.settings.updateGameProfile(gameProfileId, gameProfileDraft);
      dispatch(settingsSlice.fetchGameProfiles({ brandId: gameProfileDraft.brandId }));
      dispatch(dialogsSlice.closeDialog(DIALOG.EDIT_GAME_PROFILE));
    } catch (error) {
      formActions.setFieldError("general", error.message);
    }
  };
