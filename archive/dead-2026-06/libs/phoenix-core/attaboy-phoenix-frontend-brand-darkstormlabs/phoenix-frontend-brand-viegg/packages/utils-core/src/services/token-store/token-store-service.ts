const JDA_TOKEN_KEY = "JdaToken";
const JDA_TOKEN_EXP_DATE = "JdaTokenExpDate";
const REFRESH_TOKEN_KEY = "RefreshToken";
const REFRESH_TOKEN_EXP_DATE = "RefreshTokenExpDate";
const USER_ID = "UserId";

export type UseToken = {
  getToken: () => string | null;
  getRefreshToken: () => string | null;
  clearToken: () => void;
  clearRefreshToken: () => void;
  saveToken: <T>(accessToken: T, refreshToken?: T) => void;
  saveTokenExpDate: (jdaExpTime: number, refreshExpTime?: number) => void;
  clearTokenExpDate: () => void;
  clearRefreshTokenExpDate: () => void;
  getTokenExpDate: () => number | null;
  getRefreshTokenExpDate: () => number | null;
  saveUserId: <T>(userId: T) => void;
  getUserId: () => string | null;
  clearUserId: () => void;
};

export const useToken = (): UseToken => {
  const getToken = () => localStorage.getItem(JDA_TOKEN_KEY);
  const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

  const clearToken = () => localStorage.removeItem(JDA_TOKEN_KEY);
  const clearRefreshToken = () => localStorage.removeItem(REFRESH_TOKEN_KEY);

  const saveToken = <T>(accessToken: T, refreshToken?: T) => {
    if (!accessToken) {
      return;
    }
    const properToken =
      typeof accessToken === "string"
        ? accessToken
        : JSON.stringify(accessToken);
    localStorage.setItem(JDA_TOKEN_KEY, properToken);

    if (refreshToken) {
      const properRefreshToken =
        typeof refreshToken === "string"
          ? refreshToken
          : JSON.stringify(refreshToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, properRefreshToken);
    }
  };

  const getTokenExpDate = () =>
    Number(localStorage.getItem(JDA_TOKEN_EXP_DATE));
  const getRefreshTokenExpDate = () =>
    Number(localStorage.getItem(REFRESH_TOKEN_EXP_DATE));

  const saveTokenExpDate = (jdaExpTime: number, refreshExpTime?: number) => {
    localStorage.setItem(JDA_TOKEN_EXP_DATE, JSON.stringify(jdaExpTime));
    if (refreshExpTime) {
      localStorage.setItem(
        REFRESH_TOKEN_EXP_DATE,
        JSON.stringify(refreshExpTime),
      );
    }
  };

  const clearTokenExpDate = () => localStorage.removeItem(JDA_TOKEN_EXP_DATE);
  const clearRefreshTokenExpDate = () =>
    localStorage.removeItem(REFRESH_TOKEN_EXP_DATE);

  const saveUserId = <T>(userId: T) => {
    if (!userId) {
      return;
    }
    const properUserId =
      typeof userId === "string" ? userId : JSON.stringify(userId);
    localStorage.setItem(USER_ID, properUserId);
  };

  const getUserId = () => localStorage.getItem(USER_ID);

  const clearUserId = () => localStorage.removeItem(USER_ID);

  return {
    getToken,
    getRefreshToken,
    clearToken,
    clearRefreshToken,
    saveToken,
    saveTokenExpDate,
    clearTokenExpDate,
    clearRefreshTokenExpDate,
    getTokenExpDate,
    getRefreshTokenExpDate,
    saveUserId,
    getUserId,
    clearUserId,
  };
};
