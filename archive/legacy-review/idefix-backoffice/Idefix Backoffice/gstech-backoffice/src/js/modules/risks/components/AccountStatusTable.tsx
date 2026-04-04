import React from "react";
import { makeStyles } from "@material-ui/styles";
import Box from "@material-ui/core/Box";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import Typography from "@material-ui/core/Typography";
import Select from "@material-ui/core/Select";
import Button from "@material-ui/core/Button";
import MenuItem from "@material-ui/core/MenuItem";
import { PLAYER_RISK_PROFILE } from "../../../core/constants";
import moment from "moment-timezone";
import { PlayerAccountStatus, RiskStatus } from "app/types";

const useStyles = makeStyles({
  formControlLabel: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    margin: 0,
    marginRight: "16px",
  },
});

interface Props {
  accountStatusValues: PlayerAccountStatus;
  onAccountStatusToggle: (field: string, value: boolean | RiskStatus) => void;
  onOpenAskingForReasonDialog: (field: string, value: string) => void;
}

export default ({ onAccountStatusToggle, onOpenAskingForReasonDialog, accountStatusValues }: Props) => {
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
          <Box mr={3}>{modified?.verified?.name && `Checked by ${modified.verified.name}`}</Box>
          <Box mr={3}>
            {modified?.verified?.timestamp && `${moment(modified.verified.timestamp).format("DD.MM.YYYY HH:mm")}`}
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
                  onChange={(e: React.ChangeEvent<any>) => onOpenAskingForReasonDialog("riskProfile", e.target.value)}
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
          <Box mr={3}>{modified?.riskProfile?.name && `Checked by ${modified.riskProfile.name}`}</Box>
          <Box mr={3}>
            {modified?.riskProfile?.timestamp && `${moment(modified.riskProfile.timestamp).format("DD.MM.YYYY HH:mm")}`}
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
          <Box mr={3}>{modified?.pep?.name && `Checked by ${modified.pep.name}`}</Box>
          <Box mr={3}>{modified?.pep?.timestamp && `${moment(modified.pep.timestamp).format("DD.MM.YYYY HH:mm")}`}</Box>
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
