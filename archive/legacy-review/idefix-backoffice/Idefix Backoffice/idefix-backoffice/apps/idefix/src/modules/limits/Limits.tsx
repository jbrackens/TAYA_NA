import { FC } from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";

import { useLimits } from "./hooks";
import { ActiveLimits } from "./components/ActiveLimits";
import { HistoryTable } from "./components/HistoryTable";
import { AccountStatus } from "../account-status";

const Limits: FC = () => {
  const {
    limitsHistory,
    isLoadingLimitsHistory,
    activeLimits,
    isLoadingActiveLimits,
    handleOpenSetLimitDialog,
    handleOpenCancelLimitConfirmationDialog,
    handleOpenRaiseLimitDialog
  } = useLimits();

  return (
    <Box>
      <Box>
        <Box>
          <AccountStatus />
        </Box>

        <Box mt={3}>
          <Divider light />
        </Box>

        <Box mt={3}>
          <ActiveLimits
            isLoadingActiveLimits={isLoadingActiveLimits}
            limits={activeLimits}
            onSetLimit={handleOpenSetLimitDialog}
            onOpenCancelLimitConfirmationDialog={handleOpenCancelLimitConfirmationDialog}
            onOpenRaiseLimitDialog={handleOpenRaiseLimitDialog}
          />
        </Box>

        <Box mt={3}>
          <Divider light />
        </Box>

        <Box mt={3}>
          <Box display="flex" flexDirection="column" flexGrow={1} minHeight="500px" paddingBottom={12}>
            <HistoryTable history={limitsHistory} isLoadingHistory={isLoadingLimitsHistory} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export { Limits };
