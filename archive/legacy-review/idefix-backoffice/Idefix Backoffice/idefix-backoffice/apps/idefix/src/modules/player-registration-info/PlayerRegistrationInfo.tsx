import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import { FC } from "react";

import { TooltipCard } from "@idefix-backoffice/shared/ui";

import { usePlayerRegistrationInfo } from "./hooks";
import { LoadingIndicator } from "@idefix-backoffice/idefix/components";

const PlayerRegistrationInfo: FC = () => {
  const { registrationInfo, isLoadingRegistrationInfo } = usePlayerRegistrationInfo();

  return (
    <Box>
      <Typography variant="subtitle2">Registration Info</Typography>
      <Box sx={{ flexGrow: 1 }}>
        {isLoadingRegistrationInfo ? (
          <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
            <LoadingIndicator />
          </Box>
        ) : (
          <Grid container spacing={2} columns={3} mt={3}>
            <Grid item xs={1}>
              <Box display="flex">
                <TooltipCard label="Affiliate">{registrationInfo?.affiliateName ?? "Empty"}</TooltipCard>
              </Box>
            </Grid>
            <Grid item xs={1}>
              <Box display="flex">
                <TooltipCard label="Affiliate Registration Code">
                  {registrationInfo?.affiliateRegistrationCode ?? "Empty"}
                </TooltipCard>
              </Box>
            </Grid>
            <Grid item xs={1}>
              <Box display="flex">
                <TooltipCard label="Registration IP">{registrationInfo?.registrationIP ?? "Empty"}</TooltipCard>
              </Box>
            </Grid>
            <Grid item xs={1}>
              <Box display="flex">
                <TooltipCard label="Registration Country">
                  {registrationInfo?.registrationCountry ?? "Empty"}
                </TooltipCard>
              </Box>
            </Grid>
            <Grid item xs={1}>
              <Box display="flex">
                <TooltipCard label="Registration Time">{registrationInfo?.registrationTime ?? "Empty"}</TooltipCard>
              </Box>
            </Grid>
            <Grid item xs={1}>
              <Box display="flex">
                <TooltipCard label="Last Login Time">{registrationInfo?.lastLogin ?? "Empty"}</TooltipCard>
              </Box>
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export { PlayerRegistrationInfo };
