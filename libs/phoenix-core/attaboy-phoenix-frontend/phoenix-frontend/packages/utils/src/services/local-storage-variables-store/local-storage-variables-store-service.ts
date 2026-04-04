const APP_USERNAME = "AppUsername";
const REMEMBER_ME = "RememberMe";
const TIMEZONE = "Timezone";
const ODDSFORMAT = "OddsFormat";

export type UseLocalStorageVariables = {
  getAppUserName: () => string | null;
  clearAppUserName: () => void;
  saveAppUserName: (username?: string) => void;
  getRememberMe: () => null | boolean;
  clearRememberMe: () => void;
  saveRememberMe: (rememberMe: boolean) => void;
  getTimezone: () => string;
  clearTimezone: () => void;
  saveTimezone: (timezone?: string) => void;
  getOddsFormat: () => string;
  clearOddsFormat: () => void;
  saveOddsFormat: (timezone?: string) => void;
};

export const useLocalStorageVariables = (): UseLocalStorageVariables => {
  const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const getAppUserName = () => localStorage.getItem(APP_USERNAME);
  const clearAppUserName = () => localStorage.removeItem(APP_USERNAME);
  const saveAppUserName = (userName?: string) => {
    if (typeof userName === "string") {
      localStorage.setItem(APP_USERNAME, userName);
    }
  };

  const getRememberMe = () => {
    const rememberMe = localStorage.getItem(REMEMBER_ME);
    if (rememberMe) {
      return JSON.parse(rememberMe);
    }
    return rememberMe;
  };
  const clearRememberMe = () => localStorage.removeItem(REMEMBER_ME);
  const saveRememberMe = (rememberMe: boolean) =>
    localStorage.setItem(REMEMBER_ME, JSON.stringify(rememberMe));

  const getTimezone = () => localStorage.getItem(TIMEZONE) || defaultTimezone;
  const clearTimezone = () => localStorage.removeItem(TIMEZONE);
  const saveTimezone = (timezone?: string) => {
    if (typeof timezone === "string") {
      localStorage.setItem(TIMEZONE, timezone);
    }
  };

  const getOddsFormat = () => localStorage.getItem(ODDSFORMAT) || "american";
  const clearOddsFormat = () => localStorage.removeItem(ODDSFORMAT);
  const saveOddsFormat = (format?: string) => {
    if (typeof format === "string") {
      localStorage.setItem(ODDSFORMAT, format);
    }
  };

  return {
    getAppUserName,
    clearAppUserName,
    saveAppUserName,
    getRememberMe,
    clearRememberMe,
    saveRememberMe,
    getTimezone,
    clearTimezone,
    saveTimezone,
    getOddsFormat,
    clearOddsFormat,
    saveOddsFormat,
  };
};
