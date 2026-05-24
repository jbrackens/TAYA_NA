import {
  defaultLocale,
  isSupportedLocale,
  localeStorageKey,
  normalizeLocale,
  SupportedLocale,
} from "./locales";

const cookieMaxAgeSeconds = 60 * 60 * 24 * 365;
const invalidCookieValue = "__invalid_locale_cookie__";

const safeDecodeURIComponent = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return invalidCookieValue;
  }
};

const readCookie = (name: string): string | undefined => {
  if (typeof document === "undefined") {
    return undefined;
  }

  const prefix = `${name}=`;
  const value = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  return value ? safeDecodeURIComponent(value.slice(prefix.length)) : undefined;
};

const writeCookie = (name: string, value: string) => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(
    value,
  )}; path=/; max-age=${cookieMaxAgeSeconds}; SameSite=Lax`;
};

export const persistLocale = (locale: string): SupportedLocale => {
  const normalizedLocale = normalizeLocale(locale);

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(localeStorageKey, normalizedLocale);
  }

  writeCookie(localeStorageKey, normalizedLocale);

  return normalizedLocale;
};

export const readPersistedLocale = (): SupportedLocale => {
  const localStorageValue =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(localeStorageKey)
      : undefined;
  const cookieValue = readCookie(localeStorageKey);
  const locale = normalizeLocale(localStorageValue || cookieValue);

  if (localStorageValue && !isSupportedLocale(localStorageValue)) {
    persistLocale(defaultLocale);
  }

  if (cookieValue && !isSupportedLocale(cookieValue)) {
    persistLocale(defaultLocale);
  }

  return locale;
};
