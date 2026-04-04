import { useCallback, useEffect, useState } from "react";
import { appSlice, authenticationSlice, useAppDispatch, useAppSelector } from "@idefix-backoffice/idefix/store";

export const useLayout = () => {
  const dispatch = useAppDispatch();
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);

  const isLoaded = useAppSelector(appSlice.getAppIsLoaded);
  const isLoggedIn = useAppSelector(authenticationSlice.getLoggedInUserId);
  const adminAccess = useAppSelector(authenticationSlice.getAdminAccess);
  const reportingAccess = useAppSelector(authenticationSlice.getReportingAccess);

  const handleOpenMenu = useCallback((event: React.MouseEvent) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleLogout = useCallback(() => {
    setAnchorEl(null);
    dispatch(authenticationSlice.logout());
  }, [dispatch]);

  const handleExpirePassword = useCallback(() => {
    setAnchorEl(null);
    dispatch(authenticationSlice.expirePassword());
  }, [dispatch]);

  useEffect(() => {
    if (isLoggedIn) {
      dispatch(appSlice.initializeSettings());
      dispatch(authenticationSlice.fetchAccessSettings());
    } else {
      dispatch(authenticationSlice.authenticationRequired());
    }
  }, [dispatch, isLoggedIn]);

  return {
    adminAccess,
    reportingAccess,
    isLoaded,
    isLoggedIn,
    anchorEl,
    handleOpenMenu,
    handleCloseMenu,
    handleLogout,
    handleExpirePassword
  };
};
