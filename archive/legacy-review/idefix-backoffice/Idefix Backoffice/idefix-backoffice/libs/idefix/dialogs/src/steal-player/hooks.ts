import { useCallback } from "react";

import { useAppDispatch, useAppSelector, sidebarSlice, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { stealLock } from "./actions";

interface Payload {
  playerId: number;
  taskIdentifier: string;
}

const useStealPlayer = (payload: Payload) => {
  const dispatch = useAppDispatch();
  const { playerId, taskIdentifier } = payload;
  const user = useAppSelector(state => sidebarSlice.getLockedPlayerUser(state, playerId));

  const handleShowTask = useCallback(() => {
    dispatch(sidebarSlice.changePlayerTab(playerId, `tasks/${taskIdentifier}`, true));
    dispatch(dialogsSlice.closeDialog(DIALOG.STEAL_PLAYER));
  }, [dispatch, playerId, taskIdentifier]);

  const handleStealLock = useCallback(
    () => dispatch(stealLock(playerId, taskIdentifier)),
    [dispatch, playerId, taskIdentifier]
  );

  const handleClose = useCallback(() => dispatch(dialogsSlice.closeDialog(DIALOG.STEAL_PLAYER)), [dispatch]);

  return { handleShowTask, handleStealLock, handleClose, user };
};

export { useStealPlayer };
