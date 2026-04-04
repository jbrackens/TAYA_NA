import { SyntheticEvent, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";

import { useAppSelector, tagsSlice, useAppDispatch } from "@idefix-backoffice/idefix/store";
import { TAGS_OPTIONS } from "./constants";

export const usePlayerTags = () => {
  const params = useParams<{ playerId: string }>();
  const dispatch = useAppDispatch();
  const tags = useAppSelector(tagsSlice.getTags);
  const isLoading = useAppSelector(tagsSlice.getIsLoading);
  const playerId = Number(params.playerId);

  const handleAdd = useCallback(
    (event: SyntheticEvent, values: string[] | null) => {
      // @ts-ignore
      if (event.key === "Backspace") {
        return;
      }

      const valueToAdd = values?.pop();

      if (valueToAdd && TAGS_OPTIONS.includes(valueToAdd)) {
        const idx = TAGS_OPTIONS.indexOf(valueToAdd);
        dispatch(tagsSlice.addPlayerTag({ playerId, tag: TAGS_OPTIONS[idx] }));
        return;
      }

      // TODO would be great to update tags API on the server to handle only POST with `string[]` to update tags
      valueToAdd && dispatch(tagsSlice.addPlayerTag({ playerId, tag: valueToAdd }));
    },
    [dispatch, playerId]
  );

  const handleRemove = useCallback(
    (tag: string) => {
      dispatch(tagsSlice.removePlayerTag({ playerId, tag }));
    },
    [dispatch, playerId]
  );

  useEffect(() => {
    if (playerId) {
      dispatch(tagsSlice.fetchPlayerTags(playerId));
    }
  }, [dispatch, playerId]);

  return { tags, isLoading, handleAdd, handleRemove };
};
