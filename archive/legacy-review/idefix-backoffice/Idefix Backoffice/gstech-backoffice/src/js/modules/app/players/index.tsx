import React from "react";
import Box from "@material-ui/core/Box";
import { makeStyles } from "@material-ui/core/styles";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../../sidebar";
import EmptyPage from "../components/EmptyPage";

const useStyles = makeStyles(() => ({
  sidebar: {
    width: 320,
    minWidth: 320,
    position: "relative",
    zIndex: 2,
    borderRight: "1px solid rgba(0, 0, 0, 0.12)",
  },
}));

export default () => {
  const { pathname } = useLocation();
  const classes = useStyles();
  const [, , playerId] = pathname.split("/");
  const selectedPlayerId = playerId && playerId !== "" ? Number(playerId.replace("@", "")) : null;

  return (
    <Box display="flex" flexGrow={1} height="calc(100vh - 49px)">
      <Box className={classes.sidebar}>
        <Sidebar selectedPlayerId={selectedPlayerId} />
      </Box>
      <Box display="flex" alignItems="stretch" flexGrow={1} width="calc(100% - 320px)" height="100%">
        {pathname === "/players" ? <EmptyPage /> : <Outlet />}
      </Box>
    </Box>
  );
};
