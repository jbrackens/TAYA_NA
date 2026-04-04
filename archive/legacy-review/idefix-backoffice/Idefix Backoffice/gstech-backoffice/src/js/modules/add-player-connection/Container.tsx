import React, { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Component from "./Component";
import {
  changePlayerConnection,
  changeSearchQuery,
  debouncedSearchPlayers,
  getIsLoading,
  getPlayers,
  getSearchQuery,
  getSelectedPlayers,
} from "./addPlayerConnectionSlice";

interface Props {
  playerId: number;
}

const Container = ({ playerId }: Props) => {
  const dispatch = useDispatch();
  const players = useSelector(getPlayers);
  const searchQuery = useSelector(getSearchQuery);
  const selectedPlayers = useSelector(getSelectedPlayers);
  const isLoading = useSelector(getIsLoading);

  const handleChangeSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => dispatch(changeSearchQuery(event.target.value)),
    [dispatch],
  );
  const handleCheckPlayer = useCallback(
    (newId: number) => {
      if (selectedPlayers?.includes(newId)) {
        const draft = selectedPlayers.filter(id => id !== newId);
        dispatch(changePlayerConnection(draft));
      } else {
        dispatch(changePlayerConnection([...selectedPlayers, newId]));
      }
    },
    [dispatch, selectedPlayers],
  );

  useEffect(() => {
    dispatch(debouncedSearchPlayers({ text: searchQuery, filters: { closed: true, playerId } }));
  }, [dispatch, playerId, searchQuery]);

  return (
    <Component
      searchQuery={searchQuery}
      players={players}
      selectedPlayers={selectedPlayers}
      isLoading={isLoading}
      onCheckPlayer={handleCheckPlayer}
      onChangeSearch={handleChangeSearch}
    />
  );
};

export default Container;
