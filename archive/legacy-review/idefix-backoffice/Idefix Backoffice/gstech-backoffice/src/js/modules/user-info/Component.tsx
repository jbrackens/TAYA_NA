import React, { ChangeEvent } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import Typography from "@material-ui/core/Typography";
import Loading from "../../core/components/Loading";
import { UserDetailsContainer } from "../user-details";
import CreateUserMenu from "./components/CreateUserMenu";
import { User, UserAccessSettings, UserLog } from "app/types";
import Divider from "@material-ui/core/Divider";
import UserLogTable from "./components/UserLogTable";

const useStyles = makeStyles(() => ({
  body: {
    flex: 1,
    overflowY: "scroll",
  },
  formControlLabel: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    margin: 0,
    marginRight: "16px",
  },
  tableCell: {
    width: "50%",
  },
}));

interface Props {
  isFetchingUser: boolean;
  user: User | null;
  isFetchingAccessSettings: boolean;
  accessSettings: UserAccessSettings | null;
  isFetchingLog: boolean;
  log: UserLog[];
  onToggleAccessSettings: (key: string) => (event: ChangeEvent<{}>, checked: boolean) => void;
  onCreateUser: () => void;
}

export default ({
  isFetchingUser,
  user,
  isFetchingAccessSettings,
  accessSettings,
  isFetchingLog,
  log,
  onToggleAccessSettings,
  onCreateUser,
}: Props) => {
  const classes = useStyles();

  return (
    <Box p={3} width={1}>
      <Box>
        <Box display="flex">
          {isFetchingUser ? (
            <Box display="flex" justifyContent="center" alignItems="center" flexGrow={1} height="104px">
              <Loading />
            </Box>
          ) : (
            <UserDetailsContainer user={user} />
          )}
        </Box>

        <Box mt={3}>
          <Divider light />
        </Box>

        <Box mt={3}>
          <Typography variant="subtitle2">Access settings</Typography>
          <Box mt={2}>
            {accessSettings && (
              <Box>
                <Box display="flex">
                  <Box display="flex" minWidth="250px">
                    <FormControlLabel
                      disabled={isFetchingAccessSettings}
                      className={classes.formControlLabel}
                      onChange={onToggleAccessSettings("accountClosed")}
                      control={<Switch checked={accessSettings.accountClosed} color="primary" />}
                      label={<Typography variant="body2">Account closed</Typography>}
                      labelPlacement="start"
                    />
                  </Box>
                  <Box display="flex" minWidth="250px" ml={6}>
                    <FormControlLabel
                      disabled={isFetchingAccessSettings}
                      className={classes.formControlLabel}
                      onChange={onToggleAccessSettings("reportingAccess")}
                      control={<Switch checked={accessSettings.reportingAccess} color="primary" />}
                      label={<Typography variant="body2">Reporting access</Typography>}
                      labelPlacement="start"
                    />
                  </Box>
                  <Box display="flex" minWidth="250px" ml={6}>
                    <FormControlLabel
                      disabled={isFetchingAccessSettings}
                      className={classes.formControlLabel}
                      onChange={onToggleAccessSettings("loginBlocked")}
                      control={<Switch checked={accessSettings.loginBlocked} color="primary" />}
                      label={<Typography variant="body2">Logins blocked</Typography>}
                      labelPlacement="start"
                    />
                  </Box>
                </Box>

                <Box display="flex" mt={1}>
                  <Box display="flex" minWidth="250px">
                    <FormControlLabel
                      disabled={isFetchingAccessSettings}
                      className={classes.formControlLabel}
                      onChange={onToggleAccessSettings("administratorAccess")}
                      control={<Switch checked={accessSettings.administratorAccess} color="primary" />}
                      label={<Typography variant="body2">Administrator access</Typography>}
                      labelPlacement="start"
                    />
                  </Box>
                  <Box display="flex" minWidth="250px" ml={6}>
                    <FormControlLabel
                      disabled={isFetchingAccessSettings}
                      className={classes.formControlLabel}
                      onChange={onToggleAccessSettings("campaignAccess")}
                      control={<Switch checked={accessSettings.campaignAccess} color="primary" />}
                      label={<Typography variant="body2">Campaign access</Typography>}
                      labelPlacement="start"
                    />
                  </Box>
                  <Box display="flex" minWidth="250px" ml={6}>
                    <FormControlLabel
                      disabled={isFetchingAccessSettings}
                      className={classes.formControlLabel}
                      onChange={onToggleAccessSettings("requirePasswordChange")}
                      control={<Switch checked={accessSettings.requirePasswordChange} color="primary" />}
                      label={<Typography variant="body2">Require password change</Typography>}
                      labelPlacement="start"
                    />
                  </Box>
                </Box>

                <Box display="flex" mt={1}>
                  <Box display="flex" minWidth="250px">
                    <FormControlLabel
                      disabled={isFetchingAccessSettings}
                      className={classes.formControlLabel}
                      onChange={onToggleAccessSettings("riskManager")}
                      control={<Switch checked={accessSettings.riskManager} color="primary" />}
                      label={<Typography variant="body2">Risk Manager</Typography>}
                      labelPlacement="start"
                    />
                  </Box>
                  <Box display="flex" minWidth="250px" ml={6}>
                    <FormControlLabel
                      disabled={isFetchingAccessSettings}
                      className={classes.formControlLabel}
                      onChange={onToggleAccessSettings("paymentAccess")}
                      control={<Switch checked={accessSettings.paymentAccess} color="primary" />}
                      label={<Typography variant="body2">Payment access</Typography>}
                      labelPlacement="start"
                    />
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        <Box mt={3}>
          <Divider light />
        </Box>

        <Box mt={3}>
          <UserLogTable log={log} isFetchingLog={isFetchingLog} />
        </Box>
      </Box>
      <Box position="fixed" bottom={16} right={16}>
        <CreateUserMenu onCreateUser={onCreateUser} />
      </Box>
    </Box>
  );
};
