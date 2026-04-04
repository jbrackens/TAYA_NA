import React from "react";
import moment from "moment-timezone";
import { makeStyles, Theme, withStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import LinearProgress from "@material-ui/core/LinearProgress";
import { RewardProgress } from "app/types";

const BorderLinearProgress = withStyles((theme: Theme) => ({
  root: {
    borderRadius: 2,
  },
  colorPrimary: {
    backgroundColor: theme.colors.blue + "29",
  },
  bar: {
    borderRadius: 2,
    backgroundColor: theme.colors.blue,
  },
}))(LinearProgress);

const useStyles = makeStyles(theme => ({
  paper: {
    width: "444px",
  },
  subtitle: {
    color: theme.colors.blue,
  },
  title: {
    color: theme.colors.blue,
  },
  infoParam: {
    color: theme.colors.blackDark,
  },

  progressDescription: {
    color: theme.colors.blackDark,
  },
  progressValue: {
    ...theme.typography.h2,

    "& > :last-child": {
      ...theme.typography.h5,
      color: theme.colors.blackDark,
    },
  },
}));

const ProgressCard = ({ progress: playerProgress }: { progress: RewardProgress }) => {
  const classes = useStyles();
  const { betCount, contribution, progress, rewardType, rewards, startedAt, target, updatedAt } = playerProgress;

  return (
    <Paper className={classes.paper} square>
      <Box display="flex" flexDirection="column" p={3} height="100%">
        <Box display="flex" flexDirection="column">
          <Typography className={classes.subtitle} variant="h5">
            Next {rewardType}
          </Typography>
          {rewards?.map(({ reward }) => (
            <Typography key={reward.id} className={classes.title} variant="h4">
              {reward.externalId} {reward.description}
            </Typography>
          ))}
        </Box>
        <Box display="flex" flexDirection="column" justifyContent="flex-end" flexGrow={2} mt={3} mb={3}>
          <Box display="flex" justifyContent="space-between">
            <Typography className={classes.infoParam} variant="h3">
              Progress Started
            </Typography>
            <Typography variant="h4">{moment(startedAt).format("DD.MM.YYYY HH:mm:ss")}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography className={classes.infoParam} variant="h3">
              Last Progress
            </Typography>
            <Typography variant="h4">{moment(updatedAt).format("DD.MM.YYYY HH:mm:ss")}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography className={classes.infoParam} variant="h3">
              Bet Count
            </Typography>
            <Typography variant="h4">{betCount}</Typography>
          </Box>
        </Box>
        <Box display="flex" flexDirection="column">
          <Box display="flex" justifyContent="space-between">
            <Typography className={classes.progressDescription} variant="h5">
              Wagered
            </Typography>
            <Typography className={classes.progressDescription} variant="h5">
              Target
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography className={classes.progressValue}>
              {contribution / 100} <span>({Math.round(progress)}%)</span>
            </Typography>
            <Typography className={classes.progressValue}>{target / 100}</Typography>
          </Box>
          <Box mt={1}>
            <BorderLinearProgress variant="determinate" value={progress} />
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default ProgressCard;
