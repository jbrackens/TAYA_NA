import { useEffect } from "react";
import { useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector, playerSlice, rewardsSlice } from "@idefix-backoffice/idefix/store";

export const useRewards = () => {
  const dispatch = useAppDispatch();
  const params = useParams<{ playerId: string }>();
  const playerId = Number(params.playerId);
  const brandId = useAppSelector(playerSlice.getPlayerBrandId);

  const progresses = useAppSelector(rewardsSlice.getProgresses);
  const isProgressesLoading = useAppSelector(rewardsSlice.getIsProgressesLoading);

  const error = useAppSelector(rewardsSlice.getError);

  useEffect(() => {
    dispatch(rewardsSlice.fetchInitGroups());
  }, [dispatch]);

  useEffect(() => {
    if (brandId) {
      dispatch(rewardsSlice.fetchPlayerBalance({ playerId, brandId }));
      dispatch(rewardsSlice.fetchPlayerProgresses({ playerId, brandId }));
    }
  }, [brandId, dispatch, playerId]);

  return { progresses, isProgressesLoading, error };
};
