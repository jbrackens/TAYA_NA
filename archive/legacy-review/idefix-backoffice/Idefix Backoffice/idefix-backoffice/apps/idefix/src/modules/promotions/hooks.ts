import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { promotionsSlice, useAppDispatch, useAppSelector } from "@idefix-backoffice/idefix/store";

export const usePromotions = () => {
  const dispatch = useAppDispatch();
  const promotions = useAppSelector(promotionsSlice.getPromotions);
  const isLoadingPromotions = useAppSelector(promotionsSlice.getIsLoadingPromotions);
  const segments = useAppSelector(promotionsSlice.getSegments);
  const isLoadingSegments = useAppSelector(promotionsSlice.getIsLoadingSegments);
  const params = useParams<{ playerId: string }>();
  const playerId = Number(params.playerId);

  useEffect(() => {
    dispatch(promotionsSlice.fetchPromotions(playerId));
    dispatch(promotionsSlice.fetchSegments(playerId));
  }, [dispatch, playerId]);

  return { promotions, isLoadingPromotions, segments, isLoadingSegments };
};
