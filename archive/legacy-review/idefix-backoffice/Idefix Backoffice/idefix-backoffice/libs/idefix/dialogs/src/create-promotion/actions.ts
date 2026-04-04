import { FormikHelpers } from "formik";

import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, settingsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { Promotion, DIALOG } from "@idefix-backoffice/idefix/types";
import { PromotionFormValues } from "@idefix-backoffice/idefix/forms";

interface Props {
  games?: number[];
  promotionDraft: Omit<Promotion, "id"> & { brandId: string };
  formikActions: FormikHelpers<PromotionFormValues>;
}

export const save =
  ({ promotionDraft, games, formikActions }: Props) =>
  async (dispatch: AppDispatch) => {
    try {
      const promotion = await api.settings.createPromotion(promotionDraft);
      if (!promotion.allGames) {
        await api.settings.addPromotionGames(promotion.id, games as number[]);
      }
      dispatch(settingsSlice.fetchPromotions({ brandId: promotionDraft.brandId }));
      dispatch(dialogsSlice.closeDialog(DIALOG.CREATE_PROMOTION));
    } catch (error) {
      formikActions.setFieldError("general", error.message);
    }
  };
