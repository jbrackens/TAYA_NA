import React from "react";
import Box from "@material-ui/core/Box";
import { CampaignsTab, PlayerActiveCampaigns } from "app/types";
import CampaignsTable from "./components/CampaignsTable";
import ActiveCampaignsTable from "./components/ActiveCampaignsTable";

interface Props {
  isLoading: boolean;
  campaigns: CampaignsTab["content"] | undefined;
  activeCampaigns: PlayerActiveCampaigns[];
  isActiveCampaignsLoading: boolean;
}

const Component = ({ campaigns, activeCampaigns, isLoading, isActiveCampaignsLoading }: Props) => {
  return (
    <Box p={3}>
      <Box display="flex" flexDirection="column" position="relative">
        <ActiveCampaignsTable activeCampaigns={activeCampaigns} isLoading={isActiveCampaignsLoading} />
      </Box>

      <Box display="flex" flexDirection="column" position="relative" mt={3} paddingBottom={12}>
        <CampaignsTable campaigns={campaigns} isLoading={isLoading} />
      </Box>
    </Box>
  );
};

export default Component;
