import { useParams } from "react-router-dom";
import { addPlayerConnectionSlice, useAppDispatch, useAppSelector } from "@idefix-backoffice/idefix/store";
import { useCallback, useEffect } from "react";

export const useAddPlayerConnection = () => {
  const dispatch = useAppDispatch();
  const players = useAppSelector(addPlayerConnectionSlice.getPlayers);
  const searchQuery = useAppSelector(addPlayerConnectionSlice.getSearchQuery);
  const selectedPlayers = useAppSelector(addPlayerConnectionSlice.getSelectedPlayers);
  const isLoading = useAppSelector(addPlayerConnectionSlice.getIsLoading);
  const params = useParams<{ playerId: string }>();
  const playerId = Number(params.playerId);

  const handleChangeSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(addPlayerConnectionSlice.changeSearchQuery(event.target.value));
    },
    [dispatch]
  );

  const handleCheckPlayer = useCallback(
    (newId: number) => {
      if (selectedPlayers?.includes(newId)) {
        const draft = selectedPlayers.filter(id => id !== newId);
        dispatch(addPlayerConnectionSlice.changePlayerConnection(draft));
      } else {
        dispatch(addPlayerConnectionSlice.changePlayerConnection([...selectedPlayers, newId]));
      }
    },
    [dispatch, selectedPlayers]
  );

  useEffect(() => {
    dispatch(
      addPlayerConnectionSlice.debouncedSearchPlayers({ text: searchQuery, filters: { closed: true, playerId } })
    );
  }, [dispatch, playerId, searchQuery]);

  return {
    players,
    searchQuery,
    selectedPlayers,
    isLoading,
    handleChangeSearch,
    handleCheckPlayer
  };
};
