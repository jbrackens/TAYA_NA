import React from "react";
import moment from "moment-timezone";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import { PLAYER_RISK_PROFILE } from "../../core/constants";
import { PlayerAccountStatusDraft } from "app/types";
import Button from "@material-ui/core/Button";
import TooltipCard from "../../core/components/tooltip-card/ToolTipCard";

const useStyles = makeStyles(theme => ({
  labelRoot: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    margin: 0,
  },
  linkText: {
    cursor: "pointer",
  },
}));

interface AccountStatusProps extends Omit<PlayerAccountStatusDraft, "pep" | "reason"> {
  ddMissing: boolean;
  depositLimitReached: string | null;
  isRiskManager: boolean | undefined;
  onAccountStatusToggle: (field: keyof PlayerAccountStatusDraft, value: any) => void;
  onOpenPlayersWithClosedAccountsDialog: () => void;
  onOpenAskingForReasonDialog: (field: keyof PlayerAccountStatusDraft, value: any) => void;
}

export default ({
  verified,
  accountClosed,
  gamblingProblem,
  accountSuspended,
  allowGameplay,
  preventLimitCancel,
  allowTransactions,
  loginBlocked,
  riskProfile,
  ddMissing,
  depositLimitReached,
  isRiskManager,
  onAccountStatusToggle,
  onOpenPlayersWithClosedAccountsDialog,
  onOpenAskingForReasonDialog,
}: AccountStatusProps) => {
  const classes = useStyles();
  const formattedDepositLimitReached = depositLimitReached && moment(depositLimitReached).format("DD.MM.YYYY HH:mm");

  return (
    <Box height={1}>
      <Box display="flex" flexDirection="column">
        <Box display="flex" justifyContent="space-between">
          <Typography variant="subtitle2">Account status and Due Diligence</Typography>
        </Box>
        <Box display="flex" mt={3}>
          <Box display="flex" flexDirection="column" justifyContent="space-between" width="50%" paddingRight={2}>
            <Box>
              <FormControlLabel
                onChange={e => onAccountStatusToggle("verified", (e.target as HTMLInputElement).checked)}
                control={<Switch checked={verified} />}
                label={
                  <Typography variant="body2" color={!verified ? "error" : "inherit"}>
                    Player identity verified and Due Diligence completed
                  </Typography>
                }
                labelPlacement="start"
                classes={{ root: classes.labelRoot }}
              />
            </Box>
            <Box>
              <FormControlLabel
                disabled={ddMissing}
                onChange={e => onAccountStatusToggle("allowGameplay", (e.target as HTMLInputElement).checked)}
                control={<Switch checked={!ddMissing && allowGameplay} />}
                label={
                  <Typography variant="body2" color={!allowGameplay ? "error" : "inherit"}>
                    Allow gameplay
                  </Typography>
                }
                labelPlacement="start"
                classes={{ root: classes.labelRoot }}
              />
            </Box>
            <Box>
              <FormControlLabel
                disabled={ddMissing}
                onChange={e => onAccountStatusToggle("preventLimitCancel", (e.target as HTMLInputElement).checked)}
                control={<Switch checked={!ddMissing && preventLimitCancel} />}
                label={
                  <Typography variant="body2" color={preventLimitCancel ? "error" : "inherit"}>
                    Prevent Limit Cancellation
                  </Typography>
                }
                labelPlacement="start"
                classes={{ root: classes.labelRoot }}
              />
            </Box>
            <Box>
              <FormControlLabel
                onChange={e => onAccountStatusToggle("loginBlocked", (e.target as HTMLInputElement).checked)}
                control={<Switch checked={loginBlocked} />}
                label={
                  <Typography variant="body2" color={loginBlocked ? "error" : "inherit"}>
                    Logins blocked
                  </Typography>
                }
                labelPlacement="start"
                classes={{ root: classes.labelRoot }}
              />
            </Box>
            <Box>
              <FormControlLabel
                disabled={ddMissing}
                onChange={e => onAccountStatusToggle("allowTransactions", (e.target as HTMLInputElement).checked)}
                control={<Switch checked={!ddMissing && allowTransactions} />}
                label={
                  <Typography variant="body2" color={!allowTransactions ? "error" : "inherit"}>
                    Allow transactions
                  </Typography>
                }
                labelPlacement="start"
                classes={{ root: classes.labelRoot }}
              />
            </Box>

            <Box>
              {accountClosed ? (
                <FormControlLabel
                  disabled={gamblingProblem && !isRiskManager}
                  onChange={e => onAccountStatusToggle("accountClosed", (e.target as HTMLInputElement).checked)}
                  control={<Switch checked={accountClosed} />}
                  label={
                    <Typography variant="body2">
                      Account closed (new account can be created with same email/phone)
                    </Typography>
                  }
                  labelPlacement="start"
                  classes={{ root: classes.labelRoot }}
                />
              ) : (
                <FormControlLabel
                  disabled={gamblingProblem && !isRiskManager}
                  onChange={e => onAccountStatusToggle("accountSuspended", (e.target as HTMLInputElement).checked)}
                  control={<Switch checked={accountSuspended} />}
                  label={
                    <Typography variant="body2" color={accountSuspended ? "error" : "inherit"}>
                      Account closed
                    </Typography>
                  }
                  labelPlacement="start"
                  classes={{ root: classes.labelRoot }}
                />
              )}
            </Box>
          </Box>
          <Box display="flex" flexDirection="column" justifyContent="space-between" width="50%" paddingLeft={2}>
            <Box display="flex" alignItems="center">
              {formattedDepositLimitReached && (
                <Box mr={1} width="300px">
                  <TooltipCard label="Deposit limit reached">{formattedDepositLimitReached || "Empty"}</TooltipCard>
                </Box>
              )}
              <FormControl fullWidth margin="normal">
                <InputLabel>Customer Risk Assessment</InputLabel>
                <Select
                  name="riskProfile"
                  value={riskProfile}
                  label="Customer Risk Assessment"
                  onChange={e => onOpenAskingForReasonDialog("riskProfile", e.target.value)}
                >
                  {PLAYER_RISK_PROFILE.map(({ value, label }) => (
                    <MenuItem value={value} key={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box alignSelf="flex-end">
              <Button onClick={onOpenPlayersWithClosedAccountsDialog}>Find player from other brands</Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
