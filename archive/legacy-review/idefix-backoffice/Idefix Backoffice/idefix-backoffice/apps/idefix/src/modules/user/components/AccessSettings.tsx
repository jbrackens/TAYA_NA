import { ChangeEvent, FC } from "react";
import Box from "@mui/material/Box";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";

import { UserAccessSettings } from "@idefix-backoffice/idefix/types";

type Setting = {
  key: keyof UserAccessSettings;
  label: string;
};

const ACCESS_SETTINGS: Setting[] = [
  {
    key: "accountClosed",
    label: "Account Closed"
  },
  {
    key: "reportingAccess",
    label: "Reporting Access"
  },
  {
    key: "loginBlocked",
    label: "Login Blocked"
  },
  {
    key: "administratorAccess",
    label: "Administrator Access"
  },
  {
    key: "campaignAccess",
    label: "Campaign Access"
  },
  {
    key: "requirePasswordChange",
    label: "Require Password Change"
  },
  { key: "riskManager", label: "Risk Manager" },
  { key: "paymentAccess", label: "Payment Access" }
];

interface Props {
  accessSettings: UserAccessSettings | null;
  isLoading: boolean;
  onUpdate: (key: keyof UserAccessSettings) => (event: ChangeEvent<HTMLInputElement>, checked: boolean) => void;
}

const AccessSettings: FC<Props> = ({ accessSettings, isLoading, onUpdate }) => {
  return (
    <Box>
      <Typography variant="subtitle2">Access settings</Typography>
      <Grid component={FormGroup} container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }} mt={3}>
        {accessSettings &&
          ACCESS_SETTINGS.map(item => (
            <Grid key={item.key} item xs={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={accessSettings[item.key] || false}
                    onChange={!isLoading ? onUpdate(item.key) : undefined}
                    name={item.key}
                  />
                }
                label={item.label}
              />
            </Grid>
          ))}
      </Grid>
    </Box>
  );
};

export { AccessSettings };
