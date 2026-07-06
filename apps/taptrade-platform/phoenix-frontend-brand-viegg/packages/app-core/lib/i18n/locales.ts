export const supportedLocales = [
  { code: "en", label: "English" },
  { code: "zh-Hans", label: "简体中文" },
  { code: "zh-Hant", label: "繁體中文" },
  { code: "tl", label: "Tagalog" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "id", label: "Bahasa Indonesia" },
] as const;

export const defaultLocale = "en";
export const localeStorageKey = "hula_locale";

export type SupportedLocale = typeof supportedLocales[number]["code"];

const supportedLocaleCodes = new Set<string>(
  supportedLocales.map((locale) => locale.code),
);

export const isSupportedLocale = (
  value: string | null | undefined,
): value is SupportedLocale =>
  typeof value === "string" && supportedLocaleCodes.has(value);

export const normalizeLocale = (
  value: string | null | undefined,
): SupportedLocale => (isSupportedLocale(value) ? value : defaultLocale);

