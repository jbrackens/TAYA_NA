import { FormikHelpers } from "formik";
import pick from "lodash/fp/pick";
import { useState, useEffect, useCallback, useMemo } from "react";

import api from "@idefix-backoffice/idefix/api";
import { Promotion, DIALOG } from "@idefix-backoffice/idefix/types";
import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { PromotionFormValues } from "@idefix-backoffice/idefix/forms";

import { save } from "./actions";

interface Payload {
  brandId: string;
  promotion: Promotion;
}

const useEditPromotion = (payload: Payload) => {
  const dispatch = useAppDispatch();
  const [games, setGames] = useState<number[]>([]);

  const { promotion, brandId } = payload;
  const { allGames, id: promotionId } = promotion;

  useEffect(() => {
    if (!allGames) {
      api.settings.getPromotionGames(promotionId).then(games => setGames(games));
    }
  }, [promotionId, allGames]);

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
        active: !!active,
        allGames: !!allGames,
        calculateRounds: !!calculateRounds,
        calculateWins: !!calculateWins,
        calculateWinsRatio: !!calculateWinsRatio,
        minimumContribution
      } as Omit<Promotion, "id">;

      allGames
        ? dispatch(save({ promotionId, promotionDraft, brandId, formikActions }))
        : dispatch(save({ promotionId, promotionDraft, brandId, games, formikActions }));
    },
    [dispatch, brandId, promotionId]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.EDIT_PROMOTION)), [dispatch]);

  const initialValues: PromotionFormValues = useMemo(
    () => ({
      ...pick(
        [
          "name",
          "multiplier",
          "autoStart",
          "allGames",
          "calculateRounds",
          "calculateWins",
          "calculateWinsRatio",
          "active",
          "minimumContribution"
        ],
        promotion
      ),
      games
    }),
    [games, promotion]
  );

  return { handleSave, handleClose, initialValues };
};

export { useEditPromotion };
