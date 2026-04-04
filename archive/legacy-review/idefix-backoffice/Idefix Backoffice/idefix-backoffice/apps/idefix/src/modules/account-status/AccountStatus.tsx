import { FC } from "react";
import format from "date-fns/format";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Button from "@mui/material/Button";

import { PLAYER_RISK_PROFILE } from "@idefix-backoffice/idefix/utils";
import { TooltipCard } from "@idefix-backoffice/shared/ui";
import { useAccountStatus } from "./hooks";
import { LoadingIndicator } from "@idefix-backoffice/idefix/components";

const labelStyle = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  margin: 0
};

const AccountStatus: FC = () => {
  const {
    accountStatus,
    isLoading,
    isRiskManager,
    handleAccountStatusToggle,
    handleOpenPlayersWithClosedAccountsDialog,
    handleOpenAskingForReasonDialog
  } = useAccountStatus();
  const formattedDepositLimitReached =
    accountStatus.depositLimitReached && format(new Date(accountStatus.depositLimitReached), "DD.MM.YYYY HH:mm");

  return (
    <Box height={1}>
      <Box display="flex" flexDirection="column">
        <Box display="flex" justifyContent="space-between">
          <Typography variant="subtitle2">Account status and Due Diligence</Typography>
        </Box>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
            <LoadingIndicator />
          </Box>
        ) : (
          <Box display="flex" mt={3}>
            <Box display="flex" flexDirection="column" justifyContent="space-between" width="50%" paddingRight={2}>
              <Box>
                <FormControlLabel
                  onChange={e => handleAccountStatusToggle("verified", (e.target as HTMLInputElement).checked)}
                  control={<Switch checked={accountStatus.verified} />}
                  label={
                    <Typography variant="body2" color={!accountStatus.verified ? "error" : "inherit"}>
                      Player identity verified and Due Diligence completed
                    </Typography>
                  }
                  labelPlacement="start"
                  sx={labelStyle}
                />
              </Box>
              <Box>
                <FormControlLabel
                  disabled={accountStatus.ddMissing}
                  onChange={e => handleAccountStatusToggle("allowGameplay", (e.target as HTMLInputElement).checked)}
                  control={<Switch checked={!accountStatus.ddMissing && accountStatus.allowGameplay} />}
                  label={
                    <Typography variant="body2" color={!accountStatus.allowGameplay ? "error" : "inherit"}>
                      Allow gameplay
                    </Typography>
                  }
                  labelPlacement="start"
                  sx={labelStyle}
                />
              </Box>
              <Box>
                <FormControlLabel
                  disabled={accountStatus.ddMissing}
                  onChange={e =>
                    handleAccountStatusToggle("preventLimitCancel", (e.target as HTMLInputElement).checked)
                  }
                  control={<Switch checked={!accountStatus.ddMissing && accountStatus.preventLimitCancel} />}
                  label={
                    <Typography variant="body2" color={accountStatus.preventLimitCancel ? "error" : "inherit"}>
                      Prevent Limit Cancellation
                    </Typography>
                  }
                  labelPlacement="start"
                  sx={labelStyle}
                />
              </Box>
              <Box>
                <FormControlLabel
                  onChange={e => handleAccountStatusToggle("loginBlocked", (e.target as HTMLInputElement).checked)}
                  control={<Switch checked={accountStatus.loginBlocked} />}
                  label={
                    <Typography variant="body2" color={accountStatus.loginBlocked ? "error" : "inherit"}>
                      Logins blocked
                    </Typography>
                  }
                  labelPlacement="start"
                  sx={labelStyle}
                />
              </Box>
              <Box>
                <FormControlLabel
                  disabled={accountStatus.ddMissing}
                  onChange={e => handleAccountStatusToggle("allowTransactions", (e.target as HTMLInputElement).checked)}
                  control={<Switch checked={!accountStatus.ddMissing && accountStatus.allowTransactions} />}
                  label={
                    <Typography variant="body2" color={!accountStatus.allowTransactions ? "error" : "inherit"}>
                      Allow transactions
                    </Typography>
                  }
                  labelPlacement="start"
                  sx={labelStyle}
                />
              </Box>

              <Box>
                {accountStatus.accountClosed ? (
                  <FormControlLabel
                    disabled={accountStatus.gamblingProblem && !isRiskManager}
                    onChange={e => handleAccountStatusToggle("accountClosed", (e.target as HTMLInputElement).checked)}
                    control={<Switch checked={accountStatus.accountClosed} />}
                    label={
                      <Typography variant="body2">
                        Account closed (new account can be created with same email/phone)
                      </Typography>
                    }
                    labelPlacement="start"
                    sx={labelStyle}
                  />
                ) : (
                  <FormControlLabel
                    disabled={accountStatus.gamblingProblem && !isRiskManager}
                    onChange={e =>
                      handleAccountStatusToggle("accountSuspended", (e.target as HTMLInputElement).checked)
                    }
                    control={<Switch checked={accountStatus.accountSuspended} />}
                    label={
                      <Typography variant="body2" color={accountStatus.accountSuspended ? "error" : "inherit"}>
                        Account closed
                      </Typography>
                    }
                    labelPlacement="start"
                    sx={labelStyle}
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
                    value={accountStatus.riskProfile}
                    label="Customer Risk Assessment"
                    onChange={e => handleOpenAskingForReasonDialog("riskProfile", e.target.value)}
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
                <Button onClick={handleOpenPlayersWithClosedAccountsDialog}>Find player from other brands</Button>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export { AccountStatus };
