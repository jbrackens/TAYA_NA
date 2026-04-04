import { useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";

import {
  useAppDispatch,
  historyAndNotesSlice,
  useAppSelector,
  authenticationSlice,
  dialogsSlice
} from "@idefix-backoffice/idefix/store";
import { DIALOG, EventType } from "@idefix-backoffice/idefix/types";

export const useHistory = () => {
  const dispatch = useAppDispatch();
  const events = useAppSelector(historyAndNotesSlice.getEvents);
  const isLoadingEvents = useAppSelector(historyAndNotesSlice.getIsLoadingEvents);
  const filters = useAppSelector(historyAndNotesSlice.getFilters);
  const userId = useAppSelector(authenticationSlice.getUserId);
  const params = useParams<{ playerId: string }>();
  const playerId = Number(params.playerId);

  const handleArchiveNote = useCallback(
    (id: number) => () => {
      dispatch(dialogsSlice.openDialog(DIALOG.CONFIRM_ARCHIVATION_PLAYER_NOTE, { noteId: id, playerId }));
    },
    [dispatch, playerId]
  );

  const handleFilterChange = useCallback(
    (filter: EventType) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.checked;
      dispatch(historyAndNotesSlice.changeFilterValue({ filter, value }));
    },
    [dispatch]
  );

  useEffect(() => {
    if (playerId) {
      dispatch(historyAndNotesSlice.fetchEvents(playerId));
    }
  }, [dispatch, playerId]);

  return { events, isLoadingEvents, handleArchiveNote, userId, playerId, filters, handleFilterChange };
};
