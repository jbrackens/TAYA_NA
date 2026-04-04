import React, { ReactNode } from "react";
import { makeStyles } from "@material-ui/styles";
import Box from "@material-ui/core/Box";

const useStyles = makeStyles({
  column: {
    paddingRight: 24,

    "&:last-child": {
      paddingRight: 0,
    },
  },
});

export default ({ children }: { children: ReactNode }) => {
  const classes = useStyles();

  return (
    <Box display="flex" flexDirection="column" flexGrow="1" className={classes.column}>
      {children}
    </Box>
  );
};
