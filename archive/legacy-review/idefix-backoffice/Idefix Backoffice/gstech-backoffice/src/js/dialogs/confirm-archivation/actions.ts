import api from "../../core/api";
import { refetchBonuses, refetchPromotions } from "../../modules/settings";
import { closeDialog } from "../";
import { AppDispatch } from "../../../index";

interface Props {
  id: number;
  brandId: string;
}

export const confirmArchiveBonus = ({ id, brandId }: Props) => (dispatch: AppDispatch) =>
  api.settings.archiveBonus(id).then(() => {
    dispatch(refetchBonuses({ brandId }));
    dispatch(closeDialog("confirm-archivation"));
  });

export const confirmArchivePromotion = ({ id, brandId }: Props) => (dispatch: AppDispatch) =>
  api.settings.archivePromotion(id).then(() => {
    dispatch(refetchPromotions({ brandId }));
    dispatch(closeDialog("confirm-archivation"));
  });
