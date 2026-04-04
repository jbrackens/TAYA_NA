import api from "../../core/api";
import { refetchPromotions } from "../../modules/settings";
import { closeDialog } from "../";
import { AppDispatch } from "../../../index";
import { FormikHelpers } from "formik";
import { Promotion } from "app/types";
import { FormValues } from "./index";

interface Props {
  promotionId: number;
  promotionDraft: Omit<Promotion, "id">;
  brandId: string;
  games?: number[];
  formikActions: FormikHelpers<FormValues>;
}

export const save = ({ promotionId, promotionDraft, brandId, games, formikActions }: Props) => async (
  dispatch: AppDispatch,
) => {
  try {
    await api.settings.updatePromotion(promotionId, promotionDraft);
    if (!promotionDraft.allGames && games) {
      await api.settings.updatePromotionGames(promotionId, games);
    }
    dispatch(refetchPromotions({ brandId }));
    dispatch(closeDialog("edit-promotion"));
  } catch (error) {
    formikActions.setFieldError("general", error.message);
  }
};
