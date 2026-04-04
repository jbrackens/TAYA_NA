import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import Component from "./Component";
import {
  fetchActiveCampaigns,
  fetchCampaigns,
  getActiveCampaigns,
  getCampaigns,
  getIsActiveCampaignsLoading,
  getIsLoading,
} from "./campaignsTabSlice";

const Container = () => {
  const dispatch = useDispatch();
  const params = useParams();
  const playerId = Number(params.playerId);
  const campaigns = useSelector(getCampaigns);
  const campaignsContent = campaigns?.content;
  const isLoading = useSelector(getIsLoading);
  const isActiveCampaignsLoading = useSelector(getIsActiveCampaignsLoading);
  const activeCampaigns = useSelector(getActiveCampaigns);

  useEffect(() => {
    dispatch(fetchCampaigns({ playerId }));
    dispatch(fetchActiveCampaigns(playerId));
  }, [dispatch, playerId]);

  return (
    <Component
      campaigns={campaignsContent}
      activeCampaigns={activeCampaigns}
      isActiveCampaignsLoading={isActiveCampaignsLoading}
      isLoading={isLoading}
    />
  );
};

export default Container;
