import React from "react";
import Box from "@material-ui/core/Box";
import { makeStyles } from "@material-ui/core/styles";
import SidebarContainer from "../../users-sidebar";
import { Outlet } from "react-router-dom";

const useStyles = makeStyles(() => ({
  sidebar: {
    minWidth: 320,
    position: "relative",
    zIndex: 2,
    borderRight: "1px solid rgba(0, 0, 0, 0.12)",
  },
}));

export default () => {
  const classes = useStyles();

  return (
    <>
      <Box display="flex" flexGrow={1} height="calc(100vh - 49px)">
        <Box className={classes.sidebar}>
          <SidebarContainer />
        </Box>
        <Box display="flex" alignItems="stretch" flexGrow={1} height="100%">
          <Outlet />
        </Box>
      </Box>
    </>
  );
};
