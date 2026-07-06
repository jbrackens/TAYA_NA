import {
  defaultLocale,
  isSupportedLocale,
  localeStorageKey,
  normalizeLocale,
  supportedLocales,
} from "../locales";
import { persistLocale, readPersistedLocale } from "../locale-persistence";

describe("i18n locale helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = `${localeStorageKey}=; path=/; max-age=0`;
  });

  test("defines the required supported locales", () => {
    expect(supportedLocales.map((locale) => locale.code)).toEqual([
      "en",
      "zh-Hans",
      "zh-Hant",
      "tl",
      "ms",
      "id",
    ]);
  });

  test("normalizes unsupported locale values to English", () => {
    expect(defaultLocale).toBe("en");
    expect(isSupportedLocale("zh-Hans")).toBe(true);
    expect(isSupportedLocale("de")).toBe(false);
    expect(normalizeLocale("de")).toBe("en");
    expect(normalizeLocale(undefined)).toBe("en");
  });

  test("persists valid locales", () => {
    expect(persistLocale("id")).toBe("id");
    expect(localStorage.getItem(localeStorageKey)).toBe("id");
    expect(readPersistedLocale()).toBe("id");
  });

  test("resets invalid persisted locales to English", () => {
    localStorage.setItem(localeStorageKey, "de");

    expect(readPersistedLocale()).toBe("en");
    expect(localStorage.getItem(localeStorageKey)).toBe("en");
  });

  test("falls back when a persisted cookie cannot be decoded", () => {
    document.cookie = `${localeStorageKey}=%E0%A4%A; path=/`;

    expect(readPersistedLocale()).toBe("en");
  });
});
