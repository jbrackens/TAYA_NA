import { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector, playerInfoSlice } from "@idefix-backoffice/idefix/store";
import { useParams } from "react-router-dom";

export const usePlayerNote = () => {
  const params = useParams<{ playerId: string }>();
  const dispatch = useAppDispatch();
  const playerStickyNote = useAppSelector(playerInfoSlice.getPlayerStickyNote);
  const isLoading = useAppSelector(playerInfoSlice.getIsLoadingPlayerStickyNote);
  const playerId = Number(params.playerId);

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(playerStickyNote ?? "");

  const handleChange = useCallback((content: string) => {
    setContent(content);
  }, []);

  const handleEdit = useCallback(() => {
    if (isEditing) {
      setContent(playerStickyNote ?? "");
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  }, [isEditing, playerStickyNote]);

  const handleSave = useCallback(async () => {
    if (playerStickyNote !== content) {
      await dispatch(playerInfoSlice.updateStickyNote({ playerId, content }));
      dispatch(playerInfoSlice.fetchStickyNote(playerId));
      setIsEditing(false);
    }
  }, [content, dispatch, playerId, playerStickyNote]);

  useEffect(() => {
    if (playerStickyNote) setContent(playerStickyNote);
  }, [playerStickyNote]);

  useEffect(() => {
    if (playerId) {
      dispatch(playerInfoSlice.fetchStickyNote(playerId));
    }
  }, [dispatch, playerId]);

  return { playerStickyNote, isLoading, isEditing, handleEdit, content, handleChange, handleSave };
};
