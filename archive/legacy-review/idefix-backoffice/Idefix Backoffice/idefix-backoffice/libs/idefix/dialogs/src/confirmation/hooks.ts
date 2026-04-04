import { useCallback } from "react";
import { dialogsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

export const useConfirmation = ({ callback }: { callback: () => void }) => {
  const dispatch = useAppDispatch();

  const handleSubmit = useCallback(() => {
    if (callback) {
      callback();
    }
    dispatch(dialogsSlice.closeDialog(DIALOG.CONFIRMATION));
  }, [callback, dispatch]);

  const handleCloseDialog = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.CONFIRMATION)), [dispatch]);
  return { handleSubmit, handleCloseDialog };
};
