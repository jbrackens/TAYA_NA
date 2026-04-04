import {
  sidebarSlice,
  playersSlice,
  transactionsSlice,
  useAppDispatch,
  useAppSelector
} from "@idefix-backoffice/idefix/store";
import { useNavigate } from "react-router-dom";
import { useCallback } from "react";

export const usePlayerList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const playerTabs = useAppSelector(sidebarSlice.getPlayerTabs);
  const isFetching = useAppSelector(playersSlice.getIsFetching);

  const handleClick = useCallback(
    (playerId: number) => () => {
      const currentTab = playerTabs[playerId];

      navigate(`/players/${playerId}/${currentTab || "player-info"}`);
      dispatch(transactionsSlice.setInitialState());
    },
    [dispatch, navigate, playerTabs]
  );

  const handleRemove = useCallback(
    (playerId: number) => () => {
      dispatch(sidebarSlice.removeStickyPlayer(playerId));
    },
    [dispatch]
  );

  return { handleClick, handleRemove, isFetching };
};
