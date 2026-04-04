import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, settingsSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

interface Props {
  id: number;
  brandId: string;
}

export const confirmArchiveBonus =
  ({ id, brandId }: Props) =>
  (dispatch: AppDispatch) =>
    api.settings.archiveBonus(id).then(() => {
      dispatch(settingsSlice.fetchBonuses({ brandId }));
      dispatch(dialogsSlice.closeDialog(DIALOG.CONFIRM_ARCHIVATION_BONUS));
    });

export const confirmArchivePromotion =
  ({ id, brandId }: Props) =>
  (dispatch: AppDispatch) =>
    api.settings.archivePromotion(id).then(() => {
      dispatch(settingsSlice.fetchPromotions({ brandId }));
      dispatch(dialogsSlice.closeDialog(DIALOG.CONFIRM_ARCHIVATION_BONUS));
    });
