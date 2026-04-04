import React, { useEffect } from "react";
import Box from "@material-ui/core/Box";
import keys from "lodash/fp/keys";
import Chip from "../../../../core/components/Chip";
import { ActiveLimitOptions, RiskProfile } from "app/types";

const anotherStyle = {
  backgroundColor: "rgba(255,152,0,0.08)",
  color: "#FF9800",
  marginLeft: 8,
  fontWeight: 500,
  fontSize: "12px",
  lineHeight: "16px",
  borderRadius: 8,
  padding: 8,
};

interface Props {
  accountVerified: boolean;
  loginBlocked: boolean;
  allowTransactions: boolean;
  activeLimits: ActiveLimitOptions | {};
  accountClosed: boolean;
  gamblingProblem: boolean;
  potentialGamblingProblem: boolean;
  accountSuspended: boolean;
  riskProfile: RiskProfile;
  documentsRequested: boolean;
  ddPending: boolean;
  ddMissing: boolean;
  onFetchActiveLimits: () => void;
  onFetchAccountStatus: () => void;
}

const Summary = ({
  accountVerified,
  loginBlocked,
  allowTransactions,
  activeLimits,
  accountClosed,
  gamblingProblem,
  potentialGamblingProblem,
  accountSuspended,
  riskProfile,
  documentsRequested,
  ddPending,
  ddMissing,
  onFetchActiveLimits,
  onFetchAccountStatus,
}: Props) => {
  useEffect(() => {
    onFetchActiveLimits();
    onFetchAccountStatus();
  }, [onFetchActiveLimits, onFetchAccountStatus]);

  return (
    <Box display="flex" flexWrap="wrap">
      {!accountVerified ? <Chip label="KYC" /> : null}
      {keys(activeLimits).length ? <Chip label="Limit" /> : null}
      {loginBlocked ? <Chip label="Login" /> : null}
      {!allowTransactions ? <Chip label="Transfer" /> : null}
      {accountClosed || accountSuspended ? <Chip label="Closed" /> : null}
      {gamblingProblem ? <Chip label="Gambling Problem" /> : null}
      {potentialGamblingProblem ? <Chip label="Potential Gambling Problem" /> : null}
      {documentsRequested ? <Chip label="Documents Requested" /> : null}
      {riskProfile === "medium" ? <Chip style={anotherStyle} label="Risk Profile: Medium" /> : null}
      {riskProfile === "high" ? <Chip label="Risk Profile: High" /> : null}
      {riskProfile === "high" && ddPending && !ddMissing ? <Chip label="Extended Due Diligence: Pending" /> : null}
      {riskProfile !== "high" && ddPending && !ddMissing ? <Chip label="Due Diligence: Pending" /> : null}
      {riskProfile === "high" && ddMissing ? <Chip label="Extended Due Diligence: Not submitted" /> : null}
      {riskProfile !== "high" && ddMissing ? <Chip label="Due Diligence: Not submitted" /> : null}
    </Box>
  );
};

export default Summary;
