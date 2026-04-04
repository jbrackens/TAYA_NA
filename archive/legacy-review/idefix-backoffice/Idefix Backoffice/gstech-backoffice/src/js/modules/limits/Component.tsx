import React from "react";
import Box from "@material-ui/core/Box";
import { ActiveLimits } from "./components/ActiveLimits";
import HistoryTable from "./components/HistoryTable";
import { AccountStatusContainer } from "../account-status";
import { ActiveLimit, ActiveLimitOptions, LimitHistory, LimitType } from "app/types";
import Divider from "@material-ui/core/Divider";

interface Props {
  isLoadingActiveLimits: boolean;
  isLoadingHistory: boolean;
  playerId: number;
  limits: ActiveLimitOptions;
  history: LimitHistory[];
  onOpenSetLimitDialog: (type: LimitType) => void;
  onOpenCancelLimitConfirmationDialog: (
    limit: {
      exclusionKey: string;
      type: LimitType;
    },
    delay: boolean,
  ) => void;
  onOpenRaiseLimitDialog: (limit: ActiveLimit, type: LimitType) => void;
}

export default ({
  isLoadingActiveLimits,
  isLoadingHistory,
  playerId,
  limits,
  history,
  onOpenSetLimitDialog,
  onOpenCancelLimitConfirmationDialog,
  onOpenRaiseLimitDialog,
}: Props) => (
  <Box p={3}>
    <Box>
      <Box>
        <AccountStatusContainer playerId={playerId} />
      </Box>

      <Box mt={3}>
        <Divider light />
      </Box>

      <Box mt={3}>
        <ActiveLimits
          isLoadingActiveLimits={isLoadingActiveLimits}
          limits={limits}
          onSetLimit={onOpenSetLimitDialog}
          onOpenCancelLimitConfirmationDialog={onOpenCancelLimitConfirmationDialog}
          onOpenRaiseLimitDialog={onOpenRaiseLimitDialog}
        />
      </Box>

      <Box mt={3}>
        <Divider light />
      </Box>

      <Box mt={3}>
        <Box display="flex" flexDirection="column" flexGrow={1} minHeight="500px" paddingBottom={12}>
          <HistoryTable history={history} isLoadingHistory={isLoadingHistory} />
        </Box>
      </Box>
    </Box>
  </Box>
);
