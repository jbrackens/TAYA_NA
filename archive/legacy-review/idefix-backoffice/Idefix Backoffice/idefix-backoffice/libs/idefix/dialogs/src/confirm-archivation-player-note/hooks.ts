import { useCallback } from "react";
import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { archiveNote } from "./actions";

interface Payload {
  playerId: number;
  noteId: string;
}

const useConfirmArchPlayerNote = (payload: Payload) => {
  const dispatch = useAppDispatch();
  const { playerId, noteId } = payload;

  const handleArchiveNote = useCallback(() => {
    dispatch(archiveNote({ playerId, noteId: Number(noteId) }));
  }, [dispatch, noteId, playerId]);

  const handleCloseDialog = useCallback(
    () => dispatch(dialogsSlice.closeDialog(DIALOG.CONFIRM_ARCHIVATION_PLAYER_NOTE)),
    [dispatch]
  );

  return { handleArchiveNote, handleCloseDialog };
};

export { useConfirmArchPlayerNote };
