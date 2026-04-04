import React, { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPlayerTags, addPlayerTag, removePlayerTag } from "./tagsSlice";
import Component from "./Component";
import { RootState } from "../../rootReducer";

interface Props {
  playerId: number;
}

const Container = ({ playerId }: Props) => {
  const dispatch = useDispatch();
  const { isLoading, tags } = useSelector((state: RootState) => state.tags);

  useEffect(() => {
    dispatch(fetchPlayerTags({ playerId }));
  }, [dispatch, playerId]);

  const handleAddTag = useCallback((tag: string) => dispatch(addPlayerTag({ playerId, tag })), [dispatch, playerId]);
  const handleRemoveTag = useCallback((tag: string) => dispatch(removePlayerTag({ playerId, tag })), [
    dispatch,
    playerId,
  ]);

  return <Component isLoading={isLoading} tags={tags} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag} />;
};

export default Container;
