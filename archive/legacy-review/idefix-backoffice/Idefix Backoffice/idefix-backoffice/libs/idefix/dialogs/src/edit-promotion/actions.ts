import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, settingsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { Promotion, DIALOG } from "@idefix-backoffice/idefix/types";
import { PromotionFormValues } from "@idefix-backoffice/idefix/forms";

interface Props {
  promotionId: number;
  promotionDraft: Omit<Promotion, "id">;
  brandId: string;
  games?: number[];
  formikActions: FormikHelpers<PromotionFormValues>;
}

export const save =
  ({ promotionId, promotionDraft, brandId, games, formikActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      await api.settings.updatePromotion(promotionId, promotionDraft);
      if (!promotionDraft.allGames && games) {
        await api.settings.updatePromotionGames(promotionId, games);
      }
      dispatch(settingsSlice.fetchPromotions({ brandId }));
      dispatch(dialogsSlice.closeDialog(DIALOG.EDIT_PROMOTION));
    } catch (error) {
      formikActions.setFieldError("general", error.message);
    }
  };
