import { useCallback } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { confirmArchiveBonus, confirmArchivePromotion } from "./actions";

interface Payload {
  id: number;
  brandId: string;
  settingsType: string;
}

const useConfirmArchivation = (payload: Payload) => {
  const dispatch = useAppDispatch();

  const handleArchive = useCallback(() => {
    const { settingsType } = payload;

    if (settingsType === "bonuses") {
      return dispatch(confirmArchiveBonus(payload));
    }

    return dispatch(confirmArchivePromotion(payload));
  }, [dispatch, payload]);

  const handleCloseDialog = useCallback(
    () => dispatch(dialogsSlice.closeDialog(DIALOG.CONFIRM_ARCHIVATION_BONUS)),
    [dispatch]
  );

  return { handleArchive, handleCloseDialog };
};

export { useConfirmArchivation };
