import React, { FC } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { useTableStyles } from "../styles";

const EmptySearch: FC = () => {
  const classes = useTableStyles();

  return (
    <Box className={classes.notFoundContainer}>
      <Typography className={classes.notFound}>Not Found</Typography>
      <Typography className={classes.notFoundText}>
        What you searched was unfortunately not found or doesn't exist.
      </Typography>
    </Box>
  );
};

export default EmptySearch;
