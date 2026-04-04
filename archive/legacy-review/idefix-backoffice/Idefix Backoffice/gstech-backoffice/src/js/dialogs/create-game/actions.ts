import api from "../../core/api";
import { refetchGames } from "../../modules/settings";
import { changeMeta, closeDialog } from "../";
import { AppDispatch } from "../../../index";

export const fetchData = () => async (dispatch: AppDispatch) => {
  try {
    const manufacturers = await api.settings.getGameManufacturers();
    const gameProfiles = await api.settings.getAvailableGameProfiles();
    dispatch(changeMeta({ manufacturers, gameProfiles }));
  } catch (error) {
    // ignore
  }
};

interface Props {
  gameDraft: {
    gameId: string;
    name: string;
    manufacturerId: string;
    manufacturerGameId: string;
    mobileGame: boolean;
    playForFun: boolean;
    rtp: number | null;
    permalink: string;
    archived: boolean;
  };
  profileDrafts: { brandId: string; gameProfileId: number }[];
}

export const save = ({ gameDraft, profileDrafts }: Props) => async (dispatch: AppDispatch) => {
  try {
    await api.settings.createGame(gameDraft, profileDrafts);
    dispatch(refetchGames());
    dispatch(closeDialog("create-game"));
  } catch (err) {
    const keys = err.errors ? Object.keys(err.errors) : [];
    const newError = { ...err, errors: {} };

    keys.length &&
      keys.forEach(key => {
        if (key.indexOf(".") > -1) {
          const field = key.split(".")[1];

          newError.errors[field] = err.errors[key];
        } else {
          newError.errors[key] = err.errors[key];
        }
      });
  }
};
