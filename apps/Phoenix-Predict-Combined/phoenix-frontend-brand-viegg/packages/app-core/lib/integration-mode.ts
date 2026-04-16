export enum IntegrationMode {
  FULL = "full",
  MODULE = "module",
  ODDS_FEED = "odds_feed",
}

const INTEGRATION_MODE_VALUES: Set<string> = new Set<string>([
  IntegrationMode.FULL,
  IntegrationMode.MODULE,
  IntegrationMode.ODDS_FEED,
]);

export const DEFAULT_INTEGRATION_MODE = IntegrationMode.FULL;

export const parseIntegrationMode = (
  value?: string,
): IntegrationMode => {
  const normalized = `${value || ""}`.trim().toLowerCase();
  if (INTEGRATION_MODE_VALUES.has(normalized)) {
    return normalized as IntegrationMode;
  }
  return DEFAULT_INTEGRATION_MODE;
};

export const allowsLandingExperience = (mode: IntegrationMode): boolean =>
  mode === IntegrationMode.FULL || mode === IntegrationMode.ODDS_FEED;
