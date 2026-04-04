import { useEffect, useCallback, useMemo } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { GameManufacturer, GameProfile, DIALOG } from "@idefix-backoffice/idefix/types";
import { GameFormValues } from "@idefix-backoffice/idefix/forms";

import { fetchData, save } from "./actions";

interface Payload {
  manufacturers: GameManufacturer[];
  gameProfiles: { brandId: string; brandName: string; availableProfiles: GameProfile[] }[];
}

const useCreateGame = (payload: Payload) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchData());
  }, [dispatch]);

  const handleSave = useCallback(
    ({
      gameId,
      name,
      manufacturerId,
      manufacturerGameId,
      mobileGame,
      playForFun,
      rtp,
      permalink,
      archived,
      profiles = []
    }: GameFormValues) => {
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

      const profileDrafts = profiles!.map((profile, index) => ({
        brandId: payload.gameProfiles[index].brandId,
        gameProfileId: profile
      }));

      dispatch(save({ gameDraft, profileDrafts }));
    },
    [dispatch, payload]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.CREATE_GAME)), [dispatch]);

  const initialValues: GameFormValues = useMemo(
    () => ({
      archived: false,
      gameId: "",
      manufacturerGameId: "",
      manufacturerId: "",
      mobileGame: false,
      name: "",
      permalink: "",
      playForFun: false,
      profiles: [],
      rtp: ""
    }),
    []
  );

  return { handleSave, handleClose, initialValues };
};

export { useCreateGame };
