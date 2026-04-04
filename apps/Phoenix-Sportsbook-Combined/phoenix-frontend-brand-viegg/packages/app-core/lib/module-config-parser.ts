import { IntegrationMode } from "./integration-mode";

export const parseConfigList = <T extends string>(
  value: string | undefined,
  isValid: (value: string) => value is T,
): T[] => {
  if (!value) {
    return [];
  }

  const tokens = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const seen = new Set<T>();
  return tokens
    .filter((item): item is T => isValid(item))
    .filter((item) => {
      if (seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    });
};

export const resolveConfigList = <T extends string>(
  mode: IntegrationMode,
  defaultsByMode: Record<IntegrationMode, T[]>,
  overrideValue: string | undefined,
  isValid: (value: string) => value is T,
): T[] => {
  const override = parseConfigList(overrideValue, isValid);
  return override.length ? override : defaultsByMode[mode];
};
