import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, settingsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { GameFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

export const fetchData = (gameId: number) => async (dispatch: AppDispatch) => {
  try {
    const manufacturers = await api.settings.getGameManufacturers();
    const gameProfiles = await api.settings.getGameProfiles(gameId);
    dispatch(dialogsSlice.changeMeta({ manufacturers, gameProfiles }));
  } catch (error) {
    // ignore
  }
};

interface Props {
  gameId: number;
  gameDraft: {
    gameId: any;
    name: any;
    manufacturerId: any;
    manufacturerGameId: any;
    mobileGame: boolean;
    playForFun: boolean;
    rtp: number | null;
    permalink: any;
    archived: boolean;
  };
  profileDrafts: {
    brandId: string;
    gameProfileId: number;
  }[];
  formikActions: FormikHelpers<GameFormValues>;
}

export const save =
  ({ gameId, gameDraft, profileDrafts, formikActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.settings.updateGame(gameId, gameDraft);
      await api.settings.updateProfiles(gameId, profileDrafts);
      dispatch(settingsSlice.fetchGames());
      dispatch(dialogsSlice.closeDialog(DIALOG.EDIT_GAME));
    } catch (error) {
      formikActions.setFieldError("general", error.message);
    }
  };
