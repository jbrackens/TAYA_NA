import { FormikHelpers } from "formik";
import pick from "lodash/fp/pick";
import { useEffect, useCallback, useMemo } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { GameSettings, GameProfileSetting, DIALOG } from "@idefix-backoffice/idefix/types";
import { GameFormValues } from "@idefix-backoffice/idefix/forms";

import { fetchData, save } from "./actions";

interface Payload {
  game: GameSettings;
  gameProfiles: GameProfileSetting[] | undefined;
}

const useEditGame = ({ game, gameProfiles }: Payload) => {
  const dispatch = useAppDispatch();

  const { id } = game;

  useEffect(() => {
    dispatch(fetchData(id));
  }, [dispatch, id]);

  const handleSave = useCallback(
    (
      {
        gameId,
        name,
        manufacturerId,
        manufacturerGameId,
        mobileGame,
        rtp,
        playForFun,
        permalink,
        archived,
        profiles = []
      }: GameFormValues,
      formikActions: FormikHelpers<GameFormValues>
    ) => {
      const gameDraft = {
        gameId,
        name,
        manufacturerId,
        manufacturerGameId,
        mobileGame: !!mobileGame,
        playForFun: !!playForFun,
        rtp: rtp ? Number(rtp) * 100 : null,
        permalink,
        archived: !!archived
      };

      const profileDrafts =
        profiles?.map((profile, index) => ({
          brandId: (gameProfiles && gameProfiles[index].brandId) || "",
          gameProfileId: Number(profile)
        })) || [];

      dispatch(save({ gameId: id, gameDraft, profileDrafts, formikActions }));
    },
    [dispatch, gameProfiles, id]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.EDIT_GAME)), [dispatch]);

  const initialValues: GameFormValues = useMemo(
    () =>
      ({
        ...pick(
          [
            "name",
            "manufacturerName",
            "manufacturerId",
            "manufacturerGameId",
            "mobileGame",
            "playForFun",
            "gameId",
            "rtp",
            "permalink",
            "archived"
          ],
          game
        ),
        profiles: gameProfiles && gameProfiles.map(profile => profile.gameProfileId)
      } as unknown as GameFormValues),
    [game, gameProfiles]
  );

  return { handleSave, handleClose, initialValues };
};

export { useEditGame };
