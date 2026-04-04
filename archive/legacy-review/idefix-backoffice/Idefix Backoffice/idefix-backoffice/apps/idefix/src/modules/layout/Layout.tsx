import { AppBar, Box, IconButton, Menu, MenuItem, Stack, Toolbar, Tooltip } from "@mui/material";
import VerticalMenu from "@mui/icons-material/MoreVert";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { styled } from "@mui/material/styles";
import { FC } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

import { LoadingIndicator, NavLink } from "@idefix-backoffice/idefix/components";
import { Dialogs } from "../dialogs";
import { useLayout } from "./hooks";
import { useTheme } from "../../theme";

const StyledIdefixLogo = styled("img")({
  padding: "6px 8px",
  borderRadius: "6px",
  height: 32,
  cursor: "pointer"
});

const Layout: FC = () => {
  const { pathname } = useLocation();
  const {
    adminAccess,
    reportingAccess,
    isLoaded,
    isLoggedIn,
    anchorEl,
    handleOpenMenu,
    handleCloseMenu,
    handleLogout,
    handleExpirePassword
  } = useLayout();
  const { mode, handleToggleMode } = useTheme();

  return (
    <Box>
      <AppBar position="sticky">
        <Toolbar variant="dense">
          <Box display="flex" justifyContent="space-between" flexGrow={1} alignItems="center">
            <Stack direction="row" spacing={3} alignItems="center">
              <Tooltip title="Idefix version 2.7.1">
                <Link to="/players" style={{ height: "32px" }}>
                  <StyledIdefixLogo src="../../assets/idefix-logo@2x.png" />
                </Link>
              </Tooltip>
              {isLoggedIn && (
                <>
                  <NavLink to="/players" themeMode={mode}>
                    Customer support
                  </NavLink>
                  {reportingAccess && (
                    <NavLink to="/reports/users" active={pathname.split("/").includes("reports")} themeMode={mode}>
                      Reports
                    </NavLink>
                  )}
                  {adminAccess && (
                    <>
                      <NavLink to="/users" themeMode={mode}>
                        Users
                      </NavLink>
                      <NavLink
                        to="/settings/countries/all"
                        active={pathname.split("/").includes("settings")}
                        themeMode={mode}
                      >
                        Settings
                      </NavLink>
                    </>
                  )}
                </>
              )}
            </Stack>
            <Box>
              <Tooltip title={mode === "light" ? "Enable Dark" : "Enable Light"}>
                <IconButton color="inherit" onClick={() => handleToggleMode()}>
                  {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
                </IconButton>
              </Tooltip>
              <IconButton color="inherit" onClick={handleOpenMenu}>
                <VerticalMenu />
              </IconButton>
              <Box>
                <Menu
                  id="simple-menu"
                  anchorEl={anchorEl}
                  keepMounted
                  open={Boolean(anchorEl)}
                  onClose={handleCloseMenu}
                >
                  <MenuItem onClick={handleExpirePassword}>Change password</MenuItem>
                  <MenuItem onClick={handleLogout}>Sign out</MenuItem>
                </Menu>
              </Box>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
      {!isLoggedIn ? null : isLoaded ? (
        <Outlet />
      ) : (
        <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
          <LoadingIndicator />
        </Box>
      )}
      <Dialogs />
    </Box>
  );
};

export { Layout };
