import { useDispatch } from "react-redux";
import { useToken, removeSocialProviderData } from "utils";
import { logOut } from "../../lib/slices/authSlice";
import { useApi } from "../../services/api-service";
import { useEffect } from "react";

enum LogoutApiDetails {
  URL = "auth/realms/waysun-test-1/protocol/openid-connect/logout",
  METHOD = "POST",
}
export const SESSION_ID_KEY = "sessionId";

export const useLogout = () => {
  const useLogOut = useApi(LogoutApiDetails.URL, LogoutApiDetails.METHOD);
  const {
    clearToken,
    clearRefreshToken,
    clearRefreshTokenExpDate,
    clearTokenExpDate,
    clearUserId,
    getRefreshToken,
  } = useToken();

  const dispatch = useDispatch();

  const dispatchLogOut = () => {
    dispatch(logOut());
  };

  useEffect(() => {
    if (!useLogOut.statusOk) return;
    dispatchLogOut();
    clearToken();
    clearRefreshToken();
    clearRefreshTokenExpDate();
    clearTokenExpDate();
    clearUserId();
    removeSocialProviderData();
  }, [useLogOut.statusOk]);

  const logOutAndRemoveToken = () => {
    let params: any = new URLSearchParams();
    const client_id = localStorage.getItem("client_id");
    const refresh_token = getRefreshToken();
    params.append("client_id", client_id);
    params.append("refresh_token", refresh_token);
    useLogOut.triggerApi(
      params,
      {},
      { "Content-Type": "application/x-www-form-urlencoded" },
    );
  };

  const logOutWithoutApiCall = () => {
    dispatchLogOut();
    clearToken();
    clearRefreshToken();
    clearRefreshTokenExpDate();
    clearTokenExpDate();
    clearUserId();
    removeSocialProviderData();
  };

  return { logOutAndRemoveToken, logOutWithoutApiCall };
};
