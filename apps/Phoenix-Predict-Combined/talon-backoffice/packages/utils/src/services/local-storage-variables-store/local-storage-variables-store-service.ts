const APP_USERNAME = "AppUsername";
const REMEMBER_ME = "RememberMe";
const TIMEZONE = "Timezone";
const ODDSFORMAT = "OddsFormat";

// Node 25+ exposes a stub `localStorage` global without the Web Storage API
// methods unless `--localstorage-file` is set. Guarding on `typeof window`
// instead is the only check that reliably distinguishes browser from SSR.
const ls = {
  getItem: (k: string): string | null =>
    typeof window !== "undefined" ? window.localStorage.getItem(k) : null,
  setItem: (k: string, v: string): void => {
    if (typeof window !== "undefined") window.localStorage.setItem(k, v);
  },
  removeItem: (k: string): void => {
    if (typeof window !== "undefined") window.localStorage.removeItem(k);
  },
};

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
  const getAppUserName = () => ls.getItem(APP_USERNAME);
  const clearAppUserName = () => ls.removeItem(APP_USERNAME);
  const saveAppUserName = (userName?: string) => {
    if (typeof userName === "string") {
      ls.setItem(APP_USERNAME, userName);
    }
  };

  const getRememberMe = () => {
    const rememberMe = ls.getItem(REMEMBER_ME);
    if (rememberMe) {
      return JSON.parse(rememberMe);
    }
    return rememberMe;
  };
  const clearRememberMe = () => ls.removeItem(REMEMBER_ME);
  const saveRememberMe = (rememberMe: boolean) =>
    ls.setItem(REMEMBER_ME, JSON.stringify(rememberMe));

  const getTimezone = () => ls.getItem(TIMEZONE) || defaultTimezone;
  const clearTimezone = () => ls.removeItem(TIMEZONE);
  const saveTimezone = (timezone?: string) => {
    if (typeof timezone === "string") {
      ls.setItem(TIMEZONE, timezone);
    }
  };

  const getOddsFormat = () => ls.getItem(ODDSFORMAT) || "american";
  const clearOddsFormat = () => ls.removeItem(ODDSFORMAT);
  const saveOddsFormat = (format?: string) => {
    if (typeof format === "string") {
      ls.setItem(ODDSFORMAT, format);
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
