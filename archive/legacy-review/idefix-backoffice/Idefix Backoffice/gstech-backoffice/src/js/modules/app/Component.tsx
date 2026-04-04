import React from "react";
import Box from "@material-ui/core/Box";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import { NavLink } from "../../core/components/nav-link";
import AppBarMenu from "./components/AppBarMenu";
import { DialogsContainer } from "../../dialogs";
import { makeStyles } from "@material-ui/core/styles";
import CssBaseline from "@material-ui/core/CssBaseline";
import Tooltip from "@material-ui/core/Tooltip";
import { useLocation } from "react-router-dom";

const useStyles = makeStyles(theme => ({
  appBar: {
    boxShadow: theme.shadows[0],
    backgroundColor: theme.colors.white,
    borderBottom: `1px solid rgba(0, 0, 0, 0.12)`,
  },
  logo: {
    backgroundColor: theme.colors.blue,
    padding: "6px 8px",
    borderRadius: "6px",
    height: 32,
    cursor: "pointer",
  },
  links: {
    "& > :not(:first-child)": {
      marginLeft: "24px",
    },
  },
  list: {
    width: 300,
  },
}));

interface Props {
  loaded: boolean;
  adminAccess: boolean;
  reportingAccess: boolean;
  children: React.ReactNode;
  onLogout: () => void;
  onExpirePassword: () => void;
}

export default ({ loaded, adminAccess, reportingAccess, children, onLogout, onExpirePassword }: Props) => {
  const classes = useStyles();
  const { pathname } = useLocation();

  return (
    <CssBaseline>
      <Box display="flex" flexDirection="column" width="100vw" height="100%" bgcolor="#fff">
        <DialogsContainer />
        <AppBar position="static" className={classes.appBar}>
          <Toolbar variant="dense">
            <Box display="flex" flexGrow={1} alignItems="center">
              <Tooltip title="IdeFix Version 2.7.1">
                <img alt="logo" className={classes.logo} src="/images/logo@2x.png" />
              </Tooltip>
              <Box display="flex" ml={4} className={classes.links}>
                <NavLink to="/players">Customer support</NavLink>
                {reportingAccess && <NavLink to="/reports">Reports</NavLink>}
                {adminAccess && <NavLink to="/prediction-ops">Prediction Ops</NavLink>}
                {adminAccess && <NavLink to="/users">Users</NavLink>}
                {adminAccess && (
                  <NavLink to="/settings/countries/all" active={pathname.split("/").includes("settings")}>
                    Settings
                  </NavLink>
                )}
              </Box>
            </Box>
            <AppBarMenu logout={onLogout} expirePassword={onExpirePassword} />
          </Toolbar>
        </AppBar>

        {loaded ? children : undefined}
      </Box>
    </CssBaseline>
  );
};
