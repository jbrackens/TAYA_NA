import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { FC } from "react";

import { LoadingIndicator } from "@idefix-backoffice/idefix/components";
import { usePlayerPromotionalInfo } from "./hooks";

const PlayerPromotionalInfo: FC = () => {
  const { handleUpdatePromotionalInfo, promotions, userRoles, subTitle } = usePlayerPromotionalInfo();

  return (
    <Box>
      <Typography variant="subtitle2">Promotional Info</Typography>
      {subTitle && (
        <Typography variant="body2">
          Player excluded from all marketing due to self exclusion or account closure
        </Typography>
      )}
      {promotions == null ? (
        <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
          <LoadingIndicator />
        </Box>
      ) : (
        <Grid container columns={2} mt={3}>
          <Grid item xs={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={promotions?.allowEmailPromotions}
                  onChange={handleUpdatePromotionalInfo("allowEmailPromotions")}
                />
              }
              label="Allow email promotions"
            />
          </Grid>
          <Grid item xs={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={promotions?.allowSMSPromotions}
                  onChange={handleUpdatePromotionalInfo("allowSMSPromotions")}
                />
              }
              label="Allow SMS promotions"
            />
          </Grid>
          <Grid item xs={1}>
            <FormControlLabel
              control={<Switch checked={promotions?.activated} onChange={handleUpdatePromotionalInfo("activated")} />}
              label="Email address activated"
            />
          </Grid>
          <Grid item xs={1}>
            <FormControlLabel
              control={<Switch checked={promotions?.testPlayer} onChange={handleUpdatePromotionalInfo("testPlayer")} />}
              label="Test player"
              disabled={!userRoles?.includes("administrator")}
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export { PlayerPromotionalInfo };
