import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import { v1 as uuidv1 } from "uuid";
import LedgersTabs from "./components/Tabs";
import Loading from "../../core/components/Loading";
import ProgressCard from "./components/ProgressCard";
import { RewardGroup, RewardProgress } from "app/types";

const useStyles = makeStyles(theme => ({
  wrapper: {
    "& > :not(:first-child)": {
      marginLeft: theme.spacing(3),
    },
  },
}));

interface Props {
  brandId: string;
  initGroups?: RewardGroup[] | null;
  progresses: RewardProgress[];
  isProgressesLoading: boolean;
  error: string | null;
}

const Component = ({ brandId, initGroups, progresses, isProgressesLoading, error }: Props) => {
  const classes = useStyles();

  return error ? (
    <Box p="24px">{error}</Box>
  ) : (
    <Box p="24px">
      <Box display="flex" className={classes.wrapper}>
        {isProgressesLoading ? (
          <Box display="flex" justifyContent="center" width="100%">
            <Loading />
          </Box>
        ) : (
          progresses?.map(progress => <ProgressCard key={uuidv1()} progress={progress} />)
        )}
      </Box>
      <Box mt={3} paddingBottom={12}>
        <LedgersTabs brandId={brandId} initGroups={initGroups} />
      </Box>
    </Box>
  );
};

export default Component;
