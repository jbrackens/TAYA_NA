import api from "../../core/api";
import { refetchGameProfiles } from "../../modules/settings";
import { closeDialog } from "../";
import { FormValues } from "./index";
import { FormikHelpers } from "formik";
import { AppDispatch } from "../../../index";
import { GameProfile } from "app/types";

interface Props {
  gameProfileDraft: Omit<GameProfile, "id">;
  formActions: FormikHelpers<FormValues>;
}

export const save = ({ gameProfileDraft, formActions }: Props) => async (dispatch: AppDispatch) => {
  try {
    await api.settings.createGameProfile(gameProfileDraft);
    dispatch(refetchGameProfiles({ brandId: gameProfileDraft.brandId }));
    dispatch(closeDialog("create-game-profile"));
  } catch (error) {
    formActions.setFieldError("general", error.message);
  }
};
