import { useCallback, useState } from "react";

import { useAppDispatch, dialogsSlice } from "@idefix-backoffice/idefix/store";
import { DIALOG } from "@idefix-backoffice/idefix/types";

import { addPlayerNote } from "./actions";

const useAddPlayerNote = (playerId: number) => {
  const dispatch = useAppDispatch();
  const [value, setValue] = useState<string>("");
  const [error, setError] = useState<{ message: string; errors: any } | undefined>(undefined);

  const handleCreateNote = useCallback(async () => {
    try {
      await dispatch(addPlayerNote({ playerId, value }));
      setValue("");
    } catch (err) {
      setError({ message: err.message, errors: err.errors });
    }
  }, [dispatch, playerId, value]);

  const handleCancel = useCallback(() => {
    setValue("");
    setError(undefined);
    dispatch(dialogsSlice.closeDialog(DIALOG.ADD_PLAYER_NOTE));
  }, [dispatch]);

  return { handleCreateNote, handleCancel, value, error, setValue };
};

export { useAddPlayerNote };
