import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, settingsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { GameProfile, DIALOG } from "@idefix-backoffice/idefix/types";
import { GameProfileFormValues } from "@idefix-backoffice/idefix/forms";

interface Props {
  gameProfileDraft: Omit<GameProfile, "id">;
  formActions: FormikHelpers<GameProfileFormValues>;
}

export const save =
  ({ gameProfileDraft, formActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.settings.createGameProfile(gameProfileDraft);
      dispatch(settingsSlice.fetchGameProfiles({ brandId: gameProfileDraft.brandId }));
      dispatch(dialogsSlice.closeDialog(DIALOG.CREATE_GAME_PROFILE));
    } catch (error) {
      formActions.setFieldError("general", error.message);
    }
  };
