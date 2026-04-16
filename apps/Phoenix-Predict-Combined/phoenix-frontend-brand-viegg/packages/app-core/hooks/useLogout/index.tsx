import { useToken } from "@phoenix-ui/utils";
import { useLogout as useGoLogout } from "../../services/go-api";

export const SESSION_ID_KEY = "sessionId";

export const useLogout = () => {
  const goLogoutMutation = useGoLogout();
  const {
    clearToken,
    clearRefreshToken,
    clearRefreshTokenExpDate,
    clearTokenExpDate,
    clearUserId,
  } = useToken();

  const clearSessionId = () => {
    sessionStorage.removeItem(SESSION_ID_KEY);
  };

  const clearAllLocal = () => {
    clearToken();
    clearRefreshToken();
    clearRefreshTokenExpDate();
    clearTokenExpDate();
    clearUserId();
    clearSessionId();
  };

  const logOutAndRemoveToken = () => {
    goLogoutMutation.mutate(undefined, {
      onSettled: () => {
        // Go API useLogout already calls clearAuth() + dispatches logOut(),
        // but we also clear the legacy token storage for completeness
        clearAllLocal();
      },
    });
  };

  const logOutWithoutApiCall = () => {
    clearAllLocal();
  };

  return { logOutAndRemoveToken, logOutWithoutApiCall };
};
