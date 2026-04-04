import { useEffect } from "react";
import { campaignsTabSlice, useAppDispatch, useAppSelector } from "@idefix-backoffice/idefix/store";
import { useParams } from "react-router-dom";

export const useCampaigns = () => {
  const dispatch = useAppDispatch();
  const campaigns = useAppSelector(campaignsTabSlice.getCampaigns);
  const isLoadingCampaigns = useAppSelector(campaignsTabSlice.getIsLoadingCampaigns);
  const activeCampaigns = useAppSelector(campaignsTabSlice.getActiveCampaigns);
  const isLoadingActiveCampaigns = useAppSelector(campaignsTabSlice.getIsLoadingActiveCampaigns);
  const params = useParams<{ playerId: string }>();
  const playerId = Number(params.playerId);
  const campaignsContent = campaigns?.content;

  useEffect(() => {
    dispatch(campaignsTabSlice.fetchCampaigns({ playerId }));
    dispatch(campaignsTabSlice.fetchActiveCampaigns(playerId));
  }, [dispatch, playerId]);

  return { campaignsContent, isLoadingCampaigns, activeCampaigns, isLoadingActiveCampaigns };
};
