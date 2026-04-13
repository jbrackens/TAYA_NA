import { useDispatch } from "react-redux";
import { useToken } from "@phoenix-ui/utils";
import { logOut } from "../../lib/slices/authSlice";
import { useApi } from "../../services/api/api-service";
import { useEffect } from "react";

export const SESSION_ID_KEY = "sessionId";

export const useLogout = () => {
  const useLogOut = useApi("logout", "POST");
  const {
    clearToken,
    clearRefreshToken,
    clearRefreshTokenExpDate,
    clearTokenExpDate,
    clearUserId,
  } = useToken();

  const dispatch = useDispatch();

  const dispatchLogOut = () => {
    dispatch(logOut());
  };

  const getSessionId = () => {
    return sessionStorage.getItem(SESSION_ID_KEY);
  };

  const clearSessionId = () => {
    sessionStorage.removeItem(SESSION_ID_KEY);
  };

  useEffect(() => {
    if (!useLogOut.statusOk) return;

    dispatchLogOut();
    clearToken();
    clearRefreshToken();
    clearRefreshTokenExpDate();
    clearTokenExpDate();
    clearUserId();
    clearSessionId();
  }, [useLogOut.statusOk]);

  const logOutAndRemoveToken = () => {
    const sessionId = getSessionId();
    useLogOut.triggerApi({ sessionId });
  };

  const logOutWithoutApiCall = () => {
    dispatchLogOut();
    clearToken();
    clearRefreshToken();
    clearRefreshTokenExpDate();
    clearTokenExpDate();
    clearUserId();
    clearSessionId();
  };

  return { logOutAndRemoveToken, logOutWithoutApiCall };
};
