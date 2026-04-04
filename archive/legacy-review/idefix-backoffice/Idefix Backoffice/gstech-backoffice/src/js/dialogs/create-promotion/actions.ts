import api from "../../core/api";
import { refetchPromotions } from "../../modules/settings";
import { closeDialog } from "../";
import { AppDispatch } from "../../../index";
import { Promotion } from "app/types";
import { FormikHelpers } from "formik";
import { FormValues } from "./index";

interface Props {
  games?: number[];
  promotionDraft: Omit<Promotion, "id"> & { brandId: string };
  formikActions: FormikHelpers<FormValues>;
}

export const save = ({ promotionDraft, games, formikActions }: Props) => async (dispatch: AppDispatch) => {
  try {
    const promotion = await api.settings.createPromotion(promotionDraft);
    if (!promotion.allGames) {
      await api.settings.addPromotionGames(promotion.id, games as number[]);
    }
    dispatch(refetchPromotions({ brandId: promotionDraft.brandId }));
    dispatch(closeDialog("create-promotion"));
  } catch (error) {
    formikActions.setFieldError("general", error.message);
  }
};
