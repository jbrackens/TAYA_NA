import React, { FC } from "react";
import moment from "moment-timezone";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";

import { RewardProgress } from "@idefix-backoffice/idefix/types";

interface Props {
  progress: RewardProgress;
}

const ProgressCard: FC<Props> = ({ progress: playerProgress }) => {
  const { betCount, contribution, progress, rewardType, rewards, startedAt, target, updatedAt } = playerProgress;

  return (
    <Paper sx={{ width: "444px" }} square>
      <Box display="flex" flexDirection="column" p={3} height="100%">
        <Box display="flex" flexDirection="column">
          <Typography>Next {rewardType}</Typography>
          {rewards?.map(({ reward }) => (
            <Typography key={reward.id}>
              {reward.externalId} {reward.description}
            </Typography>
          ))}
        </Box>
        <Box display="flex" flexDirection="column" justifyContent="flex-end" flexGrow={2} mt={3} mb={3}>
          <Box display="flex" justifyContent="space-between">
            <Typography>Progress Started</Typography>
            <Typography>{moment(startedAt).format("DD.MM.YYYY HH:mm:ss")}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography>Last Progress</Typography>
            <Typography>{moment(updatedAt).format("DD.MM.YYYY HH:mm:ss")}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography>Bet Count</Typography>
            <Typography>{betCount}</Typography>
          </Box>
        </Box>
        <Box display="flex" flexDirection="column">
          <Box display="flex" justifyContent="space-between">
            <Typography>Wagered</Typography>
            <Typography>Target</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography>
              {contribution / 100} <span>({Math.round(progress)}%)</span>
            </Typography>
            <Typography>{target / 100}</Typography>
          </Box>
          <Box mt={1}>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export { ProgressCard };
