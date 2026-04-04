import React from "react";
import Box from "@material-ui/core/Box";
import { PlayerPromotion } from "app/types";
import PromotionsTable from "./components/PromotionsTable";
import Chip from "js/core/components/Chip";
import { makeStyles } from "@material-ui/core/styles";
import { Theme } from "@material-ui/core";
import Divider from "@material-ui/core/Divider";

interface Props {
  promotions: PlayerPromotion[];
  segments: string[];
  isLoadingPromotions: boolean;
}

const useStyles = makeStyles((theme: Theme) => ({
  wrapper: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    "& > *": {
      margin: theme.spacing(0.5),
    },
  },
}));

export default ({ promotions, segments, isLoadingPromotions }: Props) => {
  const classes = useStyles();
  return (
    <Box display="flex" flexDirection="column" flexGrow={1} p={3} paddingBottom={12}>
      {segments.length ? (
        <>
          <Box p={1} className={classes.wrapper}>
            {segments.map(segment => (
              <Chip label={segment} variant="outlined" />
            ))}
          </Box>
          <Box mt={3} mb={3}>
            <Divider light />
          </Box>
        </>
      ) : null}
      
      <PromotionsTable isLoading={isLoadingPromotions} items={promotions} />
    </Box>
  );
};
