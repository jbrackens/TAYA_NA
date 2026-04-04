import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { fetchPromotions, fetchSegments, getPromotionsState } from "./promotionsSlice";
import Component from "./Component";

const Container = () => {
  const dispatch = useDispatch();
  const { isLoadingPromotions, promotions, segments } = useSelector(getPromotionsState);
  const params = useParams();
  const playerId = Number(params.playerId);

  useEffect(() => {
    dispatch(fetchPromotions(playerId));
    dispatch(fetchSegments(playerId));
  }, [dispatch, playerId]);

  return <Component promotions={promotions} segments={segments} isLoadingPromotions={isLoadingPromotions} />;
};

export default Container;
