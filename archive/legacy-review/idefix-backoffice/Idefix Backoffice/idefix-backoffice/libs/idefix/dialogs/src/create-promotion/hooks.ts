import { FormikHelpers } from "formik";
import { useCallback, useMemo } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { PromotionFormValues } from "@idefix-backoffice/idefix/forms";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { save } from "./actions";

const useCreatePromotion = (brandId: string) => {
  const dispatch = useAppDispatch();

  const handleSave = useCallback(
    (
      {
        name,
        multiplier,
        autoStart,
        allGames,
        calculateRounds,
        calculateWins,
        calculateWinsRatio,
        minimumContribution,
        games,
        active
      }: PromotionFormValues,
      formikActions: FormikHelpers<PromotionFormValues>
    ) => {
      const promotionDraft = {
        name,
        multiplier,
        autoStart: !!autoStart,
        brandId: brandId,
        active: !!active,
        allGames: !!allGames,
        calculateRounds: !!calculateRounds,
        calculateWins: !!calculateWins,
        calculateWinsRatio: !!calculateWinsRatio,
        minimumContribution
      };

      if (!allGames) {
        dispatch(save({ promotionDraft, games, formikActions }));
        return;
      }

      dispatch(save({ promotionDraft, formikActions }));
    },
    [brandId, dispatch]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.CREATE_PROMOTION)), [dispatch]);

  const initialValues: PromotionFormValues = useMemo(
    () => ({
      name: "",
      multiplier: "",
      autoStart: false,
      allGames: false,
      calculateRounds: false,
      calculateWins: false,
      calculateWinsRatio: false,
      minimumContribution: "",
      games: [],
      active: false
    }),
    []
  );

  return { handleSave, handleClose, initialValues };
};

export { useCreatePromotion };
