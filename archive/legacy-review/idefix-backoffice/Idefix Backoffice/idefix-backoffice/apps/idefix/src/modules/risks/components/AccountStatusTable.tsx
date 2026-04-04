import React, { FC } from "react";
import { format } from "date-fns";
import { makeStyles } from "@mui/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Button from "@mui/material/Button";
import Select from "@mui/material/Select";
import { PLAYER_RISK_PROFILE } from "@idefix-backoffice/idefix/utils";
import MenuItem from "@mui/material/MenuItem";

import { PlayerAccountStatus, RiskStatus } from "@idefix-backoffice/idefix/types";

const useStyles = makeStyles({
  formControlLabel: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    margin: 0,
    marginRight: "16px"
  }
});

interface Props {
  accountStatusValues: PlayerAccountStatus;
  onAccountStatusToggle: (field: string, value: boolean | RiskStatus) => void;
  onOpenAskingForReasonDialog: (field: string, value: string) => void;
}

const AccountStatusTable: FC<Props> = ({ onAccountStatusToggle, onOpenAskingForReasonDialog, accountStatusValues }) => {
  const classes = useStyles();
  const { verified, riskProfile, pep, modified } = accountStatusValues;

  return (
    <Box>
      <Typography variant="subtitle2">Account Status</Typography>
      <Box display="flex" flexDirection="column">
        <Box display="flex" alignItems="center" height="56px">
          <Box mr="auto">
            <FormControlLabel
              classes={{ root: classes.formControlLabel }}
              onChange={(e: React.ChangeEvent<{ checked?: boolean }>) =>
                onAccountStatusToggle("verified", e.target.checked as boolean)
              }
              control={<Switch checked={verified} color="primary" />}
              label={<Typography variant="body2">Player identity verified and Due Diligence completed</Typography>}
              labelPlacement="start"
            />
          </Box>
          <Box mr={3}>{modified["verified"]?.name && `Checked by ${modified["verified"]?.name}`}</Box>
          <Box mr={3}>
            {modified["verified"]?.timestamp &&
              `${format(new Date(modified["verified"]?.timestamp), "DD.MM.YYYY HH:mm")}`}
          </Box>
          <Box>
            <Button color="primary" onClick={() => onAccountStatusToggle("verified", verified)}>
              Confirm
            </Button>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" height="56px">
          <Box mr="auto">
            <FormControlLabel
              classes={{ root: classes.formControlLabel }}
              control={
                <Select
                  value={riskProfile}
                  onChange={(e: any) => onOpenAskingForReasonDialog("riskProfile", e.target.value)}
                  name="riskProfile"
                >
                  {PLAYER_RISK_PROFILE.map(({ value, label }) => (
                    <MenuItem value={value} key={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              }
              label={<Typography variant="body2">Customer Risk Assessment</Typography>}
              labelPlacement="start"
            />
          </Box>
          <Box mr={3}>{modified["riskProfile"]?.name && `Checked by ${modified["riskProfile"]?.name}`}</Box>
          <Box mr={3}>
            {modified["riskProfile"]?.timestamp &&
              `${format(new Date(modified["riskProfile"]?.timestamp), "DD.MM.YYYY HH:mm")}`}
          </Box>
          <Box>
            <Button color="primary" onClick={() => onOpenAskingForReasonDialog("riskProfile", riskProfile)}>
              Confirm
            </Button>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" height="56px">
          <Box mr="auto">
            <FormControlLabel
              classes={{ root: classes.formControlLabel }}
              onChange={(e: React.ChangeEvent<{ checked?: boolean }>) =>
                onAccountStatusToggle("pep", e.target.checked as boolean)
              }
              control={<Switch checked={pep} color="primary" />}
              label={<Typography variant="body2">Politically Exposed Person</Typography>}
              labelPlacement="start"
            />
          </Box>
          <Box mr={3}>{modified["pep"]?.name && `Checked by ${modified["pep"]?.name}`}</Box>
          <Box mr={3}>
            {modified["pep"]?.timestamp && `${format(new Date(modified["pep"]?.timestamp), "DD.MM.YYYY HH:mm")}`}
          </Box>
          <Box>
            <Button color="primary" onClick={() => onAccountStatusToggle("pep", pep)}>
              Confirm
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export { AccountStatusTable };
