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
  const getStorage = (): Storage | null => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage || null;
  };

  const getToken = () => getStorage()?.getItem(JDA_TOKEN_KEY) || null;
  const getRefreshToken = () => getStorage()?.getItem(REFRESH_TOKEN_KEY) || null;

  const clearToken = () => getStorage()?.removeItem(JDA_TOKEN_KEY);
  const clearRefreshToken = () => getStorage()?.removeItem(REFRESH_TOKEN_KEY);

  const saveToken = <T>(accessToken: T, refreshToken?: T) => {
    const storage = getStorage();
    if (!storage) {
      return;
    }
    if (!accessToken) {
      return;
    }
    const properToken =
      typeof accessToken === "string"
        ? accessToken
        : JSON.stringify(accessToken);
    storage.setItem(JDA_TOKEN_KEY, properToken);

    if (refreshToken) {
      const properRefreshToken =
        typeof refreshToken === "string"
          ? refreshToken
          : JSON.stringify(refreshToken);
      storage.setItem(REFRESH_TOKEN_KEY, properRefreshToken);
    }
  };

  const getTokenExpDate = () => {
    const value = getStorage()?.getItem(JDA_TOKEN_EXP_DATE);
    return value ? Number(value) : null;
  };
  const getRefreshTokenExpDate = () => {
    const value = getStorage()?.getItem(REFRESH_TOKEN_EXP_DATE);
    return value ? Number(value) : null;
  };

  const saveTokenExpDate = (jdaExpTime: number, refreshExpTime?: number) => {
    const storage = getStorage();
    if (!storage) {
      return;
    }
    storage.setItem(JDA_TOKEN_EXP_DATE, JSON.stringify(jdaExpTime));
    if (refreshExpTime) {
      storage.setItem(
        REFRESH_TOKEN_EXP_DATE,
        JSON.stringify(refreshExpTime),
      );
    }
  };

  const clearTokenExpDate = () => getStorage()?.removeItem(JDA_TOKEN_EXP_DATE);
  const clearRefreshTokenExpDate = () =>
    getStorage()?.removeItem(REFRESH_TOKEN_EXP_DATE);

  const saveUserId = <T>(userId: T) => {
    const storage = getStorage();
    if (!storage) {
      return;
    }
    if (!userId) {
      return;
    }
    const properUserId =
      typeof userId === "string" ? userId : JSON.stringify(userId);
    storage.setItem(USER_ID, properUserId);
  };

  const getUserId = () => getStorage()?.getItem(USER_ID) || null;

  const clearUserId = () => getStorage()?.removeItem(USER_ID);

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
