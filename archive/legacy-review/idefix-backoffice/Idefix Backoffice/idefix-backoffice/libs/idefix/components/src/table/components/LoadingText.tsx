import React, { FC } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

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
