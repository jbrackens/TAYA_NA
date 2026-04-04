import Box from "@mui/material/Box";
import { FC } from "react";

import ActiveCampaignsTable from "./components/ActiveCampaignsTable";
import CampaignsTable from "./components/CampaignsTable";
import { useCampaigns } from "./hooks";

const Campaigns: FC = () => {
  const { campaignsContent, isLoadingCampaigns, activeCampaigns, isLoadingActiveCampaigns } = useCampaigns();
  return (
    <Box>
      <Box display="flex" flexDirection="column" position="relative">
        <ActiveCampaignsTable activeCampaigns={activeCampaigns} isLoading={isLoadingActiveCampaigns} />
      </Box>

      <Box display="flex" flexDirection="column" position="relative" mt={3} paddingBottom={12}>
        <CampaignsTable campaigns={campaignsContent} isLoading={isLoadingCampaigns} />
      </Box>
    </Box>
  );
};

export { Campaigns };
