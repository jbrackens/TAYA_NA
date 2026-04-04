import { FC } from "react";
import keys from "lodash/fp/keys";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { ActiveLimitOptions, PlayerAccountStatus } from "@idefix-backoffice/idefix/types";
import { LoadingIndicator } from "@idefix-backoffice/idefix/components";

interface Props {
  accountStatus: PlayerAccountStatus | undefined;
  isLoading: boolean;
  activeLimits: ActiveLimitOptions | Record<string, unknown>;
}

const PlayerSummary: FC<Props> = ({ accountStatus, isLoading, activeLimits }) => {
  if (!accountStatus || isLoading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center">
        <LoadingIndicator />
      </Box>
    );

  const {
    verified,
    loginBlocked,
    allowTransactions,
    accountClosed,
    accountSuspended,
    gamblingProblem,
    potentialGamblingProblem,
    documentsRequested,
    riskProfile,
    ddPending,
    ddMissing
  } = accountStatus;

  return (
    <Box>
      {!verified ? <Chip label="KYC" /> : null}
      {keys(activeLimits).length ? <Chip label="Limit" /> : null}
      {loginBlocked ? <Chip label="Login" /> : null}
      {!allowTransactions ? <Chip label="Transfer" /> : null}
      {accountClosed || accountSuspended ? <Chip label="Closed" /> : null}
      {gamblingProblem ? <Chip label="Gambling Problem" /> : null}
      {potentialGamblingProblem ? <Chip label="Potential Gambling Problem" /> : null}
      {documentsRequested ? <Chip label="Documents Requested" /> : null}
      {riskProfile === "medium" ? (
        <Chip label="Risk Profile: Medium" sx={{ backgroundColor: "rgba(255,152,0,0.08)", color: "#FF9800" }} />
      ) : null}
      {riskProfile === "high" ? <Chip label="Risk Profile: High" /> : null}
      {riskProfile === "high" && ddPending && !ddMissing ? <Chip label="Extended Due Diligence: Pending" /> : null}
      {riskProfile !== "high" && ddPending && !ddMissing ? <Chip label="Due Diligence: Pending" /> : null}
      {riskProfile === "high" && ddMissing ? <Chip label="Extended Due Diligence: Not submitted" /> : null}
      {riskProfile !== "high" && ddMissing ? <Chip label="Due Diligence: Not submitted" /> : null}
    </Box>
  );
};

export { PlayerSummary };
