const JDA_TOKEN_KEY = "JdaToken";
const JDA_TOKEN_EXP_DATE = "JdaTokenExpDate";
const REFRESH_TOKEN_KEY = "RefreshToken";
const REFRESH_TOKEN_EXP_DATE = "RefreshTokenExpDate";
const USER_ID = "UserId";

/** Safe storage accessor — returns null/noop during SSR where localStorage is unavailable */
const storage = (): Storage | null =>
  typeof window !== "undefined" && window.localStorage ? window.localStorage : null;

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
  const getToken = () => storage()?.getItem(JDA_TOKEN_KEY) ?? null;
  const getRefreshToken = () => storage()?.getItem(REFRESH_TOKEN_KEY) ?? null;

  const clearToken = () => storage()?.removeItem(JDA_TOKEN_KEY);
  const clearRefreshToken = () => storage()?.removeItem(REFRESH_TOKEN_KEY);

  const saveToken = <T>(accessToken: T, refreshToken?: T) => {
    if (!accessToken) {
      return;
    }
    const s = storage();
    if (!s) return;
    const properToken =
      typeof accessToken === "string"
        ? accessToken
        : JSON.stringify(accessToken);
    s.setItem(JDA_TOKEN_KEY, properToken);

    if (refreshToken) {
      const properRefreshToken =
        typeof refreshToken === "string"
          ? refreshToken
          : JSON.stringify(refreshToken);
      s.setItem(REFRESH_TOKEN_KEY, properRefreshToken);
    }
  };

  const getTokenExpDate = () =>
    Number(storage()?.getItem(JDA_TOKEN_EXP_DATE) ?? 0);
  const getRefreshTokenExpDate = () =>
    Number(storage()?.getItem(REFRESH_TOKEN_EXP_DATE) ?? 0);

  const saveTokenExpDate = (jdaExpTime: number, refreshExpTime?: number) => {
    const s = storage();
    if (!s) return;
    s.setItem(JDA_TOKEN_EXP_DATE, JSON.stringify(jdaExpTime));
    if (refreshExpTime) {
      s.setItem(REFRESH_TOKEN_EXP_DATE, JSON.stringify(refreshExpTime));
    }
  };

  const clearTokenExpDate = () => storage()?.removeItem(JDA_TOKEN_EXP_DATE);
  const clearRefreshTokenExpDate = () =>
    storage()?.removeItem(REFRESH_TOKEN_EXP_DATE);

  const saveUserId = <T>(userId: T) => {
    if (!userId) {
      return;
    }
    const s = storage();
    if (!s) return;
    const properUserId =
      typeof userId === "string" ? userId : JSON.stringify(userId);
    s.setItem(USER_ID, properUserId);
  };

  const getUserId = () => storage()?.getItem(USER_ID) ?? null;

  const clearUserId = () => storage()?.removeItem(USER_ID);

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
