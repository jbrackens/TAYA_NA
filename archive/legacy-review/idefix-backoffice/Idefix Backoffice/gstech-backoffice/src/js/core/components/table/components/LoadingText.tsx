import React, { FC } from "react";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";

import { useTableStyles } from "../styles";

const LoadingText: FC = () => {
  const classes = useTableStyles();

  return (
    <Box className={classes.loadingContainer}>
      <Typography className={classes.loadingText}>Loading...</Typography>
      <Typography className={classes.loadingDescription}>Please wait while we load the data.</Typography>
    </Box>
  );
};

export default LoadingText;
