import React, { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { changeFilterValue, fetchEvents, getEvents, getFilters } from "./historyAndNotesSlice";
import { openDialog } from "../../dialogs/";
import Component from "./Component";
import { getAuthenticationState } from "../authentication";
import { EventType } from "app/types";

const Container = () => {
  const dispatch = useDispatch();
  const params = useParams();
  const playerId = Number(params.playerId);
  const filters = useSelector(getFilters);
  const events = useSelector(getEvents);
  const { userId } = useSelector(getAuthenticationState);
  const filtersList = useMemo(() => Object.keys(filters), [filters]);

  useEffect(() => {
    dispatch(fetchEvents(playerId));
  }, [dispatch, playerId]);

  const handleFilterCheck = useCallback(
    (filter: EventType) => (event: React.ChangeEvent<HTMLInputElement>) =>
      dispatch(changeFilterValue({ filter, value: event.target.checked })),
    [dispatch],
  );
  const handleArchiveNote = useCallback(
    (noteId: number) => dispatch(openDialog("confirm-archivation-player-note", { playerId, noteId })),
    [dispatch, playerId],
  );

  return (
    <Component
      playerId={playerId}
      filters={filters}
      filtersList={filtersList}
      events={events}
      userId={userId!}
      onFilterCheck={handleFilterCheck}
      onArchiveNote={handleArchiveNote}
    />
  );
};

export default Container;
