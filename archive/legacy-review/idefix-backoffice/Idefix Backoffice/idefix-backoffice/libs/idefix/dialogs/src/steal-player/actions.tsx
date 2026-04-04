import api from "@idefix-backoffice/idefix/api";
import { AppDispatch, sidebarSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

export const stealLock = (playerId: number, taskType: string) => (dispatch: AppDispatch) =>
  api.locks.steal(playerId).then(() => {
    dispatch(sidebarSlice.changePlayerTab(playerId, `tasks/${taskType}`, true));
    dispatch(dialogsSlice.closeDialog(DIALOG.STEAL_PLAYER));
  });
