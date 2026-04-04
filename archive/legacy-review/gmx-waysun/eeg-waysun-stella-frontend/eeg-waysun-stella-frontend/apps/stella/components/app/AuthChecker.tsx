import React, { useEffect, useState } from "react";
import { useToken } from "utils";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { logIn, logOut, selectIsLoggedIn } from "../../lib/slices/authSlice";
import { useLogout } from "../../services/logout-services";

export default function AuthChecker({ children }) {
  const { getToken } = useToken();
  const token = typeof localStorage !== "undefined" ? getToken() : "";
  const dispatch = useDispatch();
  const { logOutAndRemoveToken } = useLogout();
  const loggedIn = useSelector(selectIsLoggedIn);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const checkvalidUser = () => {
    //   Additional checks can be implemented here...
    return token !== null && token !== "";
  };
  useEffect(() => {
    if (loading) {
      if (router.pathname === "/login") {
        loggedIn !== null && !loggedIn && setLoading(false);
      } else {
        loggedIn && setLoading(false);
      }
    }
  });
  useEffect(() => {
    checkvalidUser() ? dispatch(logIn()) : dispatch(logOut());
    return () => {
      logOutAndRemoveToken();
    };
  }, []);
  useEffect(() => {
    if (router.pathname === "/login") {
      loggedIn && router.push("/");
    } else {
      loggedIn !== null && !loggedIn && router.push("/login");
    }
  }, [loggedIn]);
  return <>{!loading && children}</>;
}
