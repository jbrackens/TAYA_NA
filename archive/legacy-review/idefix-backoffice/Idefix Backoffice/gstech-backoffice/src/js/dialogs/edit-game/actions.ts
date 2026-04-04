import api from "../../core/api";
import { refetchGames } from "../../modules/settings";
import { changeMeta, closeDialog } from "../";
import { AppDispatch } from "../../../index";
import { FormikHelpers } from "formik";
import { FormValues } from "./index";

export const fetchData = (gameId: number) => async (dispatch: AppDispatch) => {
  try {
    const manufacturers = await api.settings.getGameManufacturers();
    const gameProfiles = await api.settings.getGameProfiles(gameId);
    dispatch(changeMeta({ manufacturers, gameProfiles }));
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
  formikActions: FormikHelpers<FormValues>;
}

export const save = ({ gameId, gameDraft, profileDrafts, formikActions }: Props) => async (dispatch: AppDispatch) => {
  try {
    await api.settings.updateGame(gameId, gameDraft);
    await api.settings.updateProfiles(gameId, profileDrafts);
    dispatch(refetchGames());
    dispatch(closeDialog("edit-game"));
  } catch (error) {
    formikActions.setFieldError("general", error.message);
  }
};
