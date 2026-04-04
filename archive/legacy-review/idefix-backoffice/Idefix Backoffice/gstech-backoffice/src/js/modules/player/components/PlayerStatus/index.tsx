import React from "react";
import Box from "@material-ui/core/Box";
import Avatar from "@material-ui/core/Avatar";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import Summary from "./Summary";
import { CopyToClipboard } from "react-copy-to-clipboard";

import { ActiveLimitOptions, PlayerStatus as IPlayerStatus, RiskProfile } from "app/types";
import Tooltip from "@material-ui/core/Tooltip";

const useStyles = makeStyles({
  textId: {
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "16px",
    cursor: "pointer",
    color: "rgba(28, 32, 41, 0.48)",
  },
  textFullName: {
    marginLeft: "8px",
    cursor: "pointer",
    fontSize: "16px",
    lineHeight: "24px",
    fontWeight: "bold",
    color: "#1C2029",
  },
  textBalance: {
    fontWeight: "normal",
    fontSize: "12px",
    lineHeight: "16px",
    color: "#1C2029",
  },
  textBalanceBold: {
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "16px",
    color: "#1C2029",
  },
  avatar: {
    width: 24,
    height: 24,
    cursor: "pointer",
  },
});

interface Props {
  brandId: string;
  firstName: string;
  lastName: string;
  username: string;
  balance?: IPlayerStatus["balance"];
  isFetchingStatus: boolean;
  accountVerified: boolean;
  loginBlocked: boolean;
  allowTransactions: boolean;
  activeLimits: ActiveLimitOptions | {};
  accountClosed: boolean;
  accountSuspended: boolean;
  gamblingProblem: boolean;
  riskProfile: RiskProfile;
  documentsRequested: boolean;
  playerId: number;
  ddPending: boolean;
  ddMissing: boolean;
  potentialGamblingProblem: boolean;
  onFetchActiveLimits: () => void;
  onFetchAccountStatus: () => void;
}

export default function PlayerStatus(props: Props) {
  const {
    brandId,
    firstName,
    lastName,
    username,
    balance,
    isFetchingStatus,
    accountVerified,
    loginBlocked,
    allowTransactions,
    activeLimits,
    accountClosed,
    accountSuspended,
    gamblingProblem,
    riskProfile,
    documentsRequested,
    onFetchActiveLimits,
    onFetchAccountStatus,
    playerId,
    ddPending,
    ddMissing,
    potentialGamblingProblem,
  } = props;

  const classes = useStyles();

  return (
    <Box display="flex" justifyContent="space-between" width={1} p={3}>
      <Box display="flex">
        <CopyToClipboard text={username}>
          <Tooltip title="Copy Username">
            <Avatar src={`/images/logos/${brandId}@2x.png`} className={classes.avatar} />
          </Tooltip>
        </CopyToClipboard>
        <Box display="flex" flexDirection="column" ml={1}>
          <Box display="flex" alignItems="center">
            <CopyToClipboard text={`${brandId}_${playerId}`}>
              <Tooltip title="Copy PlayerId">
                <Typography component="span" className={classes.textId}>{`${brandId}_${playerId}`}</Typography>
              </Tooltip>
            </CopyToClipboard>
            <CopyToClipboard text={`${firstName} ${lastName}`}>
              <Tooltip title="Copy Full Name">
                <Typography component="span" className={classes.textFullName}>{`${firstName} ${lastName}`}</Typography>
              </Tooltip>
            </CopyToClipboard>
          </Box>
          {balance && (
            //@ts-ignore
            <Typography
              component="span"
              visibility={isFetchingStatus ? "hidden" : "visible"}
              className={classes.textBalance}
            >
              Balance:{" "}
              {
                <Typography component="span" className={classes.textBalanceBold}>
                  {balance.formatted?.totalBalance} {balance.currencyId}{" "}
                  {balance.reservedBalance > 0 && (
                    <Typography component="span" className={classes.textBalanceBold}>
                      + {balance.formatted.reservedBalance} {balance.currencyId}{" "}
                      <Typography component="span" className={classes.textBalance}>
                        pending withdrawals
                      </Typography>
                    </Typography>
                  )}
                </Typography>
              }
            </Typography>
          )}
        </Box>
      </Box>
      <Summary
        accountVerified={accountVerified}
        loginBlocked={loginBlocked}
        allowTransactions={allowTransactions}
        accountClosed={accountClosed}
        accountSuspended={accountSuspended}
        activeLimits={activeLimits}
        gamblingProblem={gamblingProblem}
        potentialGamblingProblem={potentialGamblingProblem}
        riskProfile={riskProfile}
        documentsRequested={documentsRequested}
        onFetchActiveLimits={onFetchActiveLimits}
        onFetchAccountStatus={onFetchAccountStatus}
        ddPending={ddPending}
        ddMissing={ddMissing}
      />
    </Box>
  );
}
