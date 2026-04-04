import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { getPlayerBrandId } from "../player";
import {
  fetchInitGroups,
  fetchPlayerBalance,
  fetchPlayerProgresses,
  getError,
  getInitGroups,
  getIsProgressesLoading,
  getProgresses,
} from "./rewardsSlice";
import Component from "./Component";
import { RewardGroup } from "app/types";

const Container = () => {
  const dispatch = useDispatch();
  const params = useParams();
  const playerId = Number(params.playerId);
  const brandId = useSelector(getPlayerBrandId);

  const progresses = useSelector(getProgresses);
  const isProgressesLoading = useSelector(getIsProgressesLoading);

  const initGroups = useSelector(getInitGroups) as RewardGroup[] | null;
  const error = useSelector(getError);

  useEffect(() => {
    dispatch(fetchInitGroups());
  }, [dispatch]);

  useEffect(() => {
    if (brandId) {
      dispatch(fetchPlayerBalance({ playerId, brandId }));
      dispatch(fetchPlayerProgresses({ playerId, brandId }));
    }
  }, [brandId, dispatch, playerId]);

  return (
    <Component
      brandId={brandId!}
      initGroups={initGroups}
      progresses={progresses}
      isProgressesLoading={isProgressesLoading}
      error={error}
    />
  );
};

export default Container;
