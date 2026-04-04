import { FormikHelpers } from "formik";
import pick from "lodash/fp/pick";
import { useCallback, useMemo } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { GameProfile, DIALOG } from "@idefix-backoffice/idefix/types";
import { GameProfileFormValues } from "@idefix-backoffice/idefix/forms";

import { save } from "./actions";

interface Payload {
  brandId: string;
  gameProfile: GameProfile;
}

const useEditGameProfile = (payload: Payload) => {
  const dispatch = useAppDispatch();

  const handleSave = useCallback(
    (
      { name, wageringMultiplier, riskProfile }: GameProfileFormValues,
      formActions: FormikHelpers<GameProfileFormValues>
    ) => {
      const { gameProfile, brandId } = payload;

      const gameProfileDraft = {
        name,
        brandId,
        wageringMultiplier: Number(wageringMultiplier),
        riskProfile
      };

      dispatch(save({ gameProfileId: gameProfile.id, gameProfileDraft, formActions }));
    },
    [dispatch, payload]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.EDIT_GAME_PROFILE)), [dispatch]);

  const initialValues: GameProfileFormValues = useMemo(
    () => ({
      ...pick(["name", "wageringMultiplier", "riskProfile"], payload && payload.gameProfile)
    }),
    [payload]
  );

  return { handleSave, handleClose, initialValues };
};

export { useEditGameProfile };
