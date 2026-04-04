import React, { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Component from "./Component";
import { getAppIsLoaded, initializeSettings } from "./appSlice";
import {
  expirePassword,
  fetchAccessSettings,
  getAdminAccess,
  getLoggedInUserId,
  getReportingAccess,
  logout,
} from "../authentication";
import { Outlet } from "react-router-dom";

const Container = () => {
  const dispatch = useDispatch();
  const userId = useSelector(getLoggedInUserId);
  const loaded = useSelector(getAppIsLoaded);
  const adminAccess = useSelector(getAdminAccess);
  const reportingAccess = useSelector(getReportingAccess);

  useEffect(() => {
    dispatch(initializeSettings());
    dispatch(fetchAccessSettings());
  }, [dispatch, userId, loaded]);

  const handleLogout = useCallback(() => dispatch(logout()), [dispatch]);
  const handleExpirePassword = useCallback(() => dispatch(expirePassword()), [dispatch]);

  return (
    <Component
      loaded={loaded}
      adminAccess={adminAccess}
      reportingAccess={reportingAccess}
      children={<Outlet />}
      onLogout={handleLogout}
      onExpirePassword={handleExpirePassword}
    />
  );
};

export default Container;
