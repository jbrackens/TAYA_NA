import Box from "@mui/material/Box";
import { FC } from "react";

import { LoadingIndicator } from "@idefix-backoffice/idefix/components";
import { LedgersTabs } from "./components/LedgersTabs";
import { ProgressCard } from "./components/ProgressCard";
import { useRewards } from "./hooks/useRewards";

const Rewards: FC = () => {
  const { progresses, isProgressesLoading, error } = useRewards();

  return error ? (
    <Box>{error}</Box>
  ) : (
    <Box>
      <Box display="flex" mr={3}>
        {isProgressesLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <LoadingIndicator />
          </Box>
        ) : (
          progresses?.map(progress => (
            <ProgressCard key={`${progress.rewardType}-${progress.startedAt}`} progress={progress} />
          ))
        )}
      </Box>
      <Box mt={3} paddingBottom={12}>
        <LedgersTabs />
      </Box>
    </Box>
  );
};

export { Rewards };
