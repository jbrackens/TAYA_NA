import { FormikHelpers } from "formik";
import { useCallback, useMemo } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { GameProfileFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { save } from "./actions";

const useCreateGameProfile = (brandId: string) => {
  const dispatch = useAppDispatch();

  const handleSave = useCallback(
    (
      { name, wageringMultiplier, riskProfile }: GameProfileFormValues,
      formActions: FormikHelpers<GameProfileFormValues>
    ) => {
      const gameProfileDraft = {
        name,
        brandId,
        wageringMultiplier: Number(wageringMultiplier),
        riskProfile
      };

      dispatch(save({ gameProfileDraft, formActions }));
    },
    [brandId, dispatch]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.CREATE_GAME_PROFILE)), [dispatch]);

  const initialValues: GameProfileFormValues = useMemo(
    () => ({
      name: "",
      wageringMultiplier: "",
      riskProfile: "low"
    }),
    []
  );

  return { handleSave, handleClose, initialValues };
};

export { useCreateGameProfile };
