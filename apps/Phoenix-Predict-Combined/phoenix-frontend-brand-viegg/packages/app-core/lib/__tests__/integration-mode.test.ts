import {
  allowsLandingExperience,
  DEFAULT_INTEGRATION_MODE,
  IntegrationMode,
  parseIntegrationMode,
} from "../integration-mode";

describe("integration mode parsing", () => {
  test("parses known modes", () => {
    expect(parseIntegrationMode("full")).toBe(IntegrationMode.FULL);
    expect(parseIntegrationMode("module")).toBe(IntegrationMode.MODULE);
    expect(parseIntegrationMode("odds_feed")).toBe(IntegrationMode.ODDS_FEED);
  });

  test("falls back to default mode", () => {
    expect(parseIntegrationMode(undefined)).toBe(DEFAULT_INTEGRATION_MODE);
    expect(parseIntegrationMode("unknown-mode")).toBe(DEFAULT_INTEGRATION_MODE);
  });

  test("landing experience is enabled in full and odds_feed modes", () => {
    expect(allowsLandingExperience(IntegrationMode.FULL)).toBe(true);
    expect(allowsLandingExperience(IntegrationMode.MODULE)).toBe(false);
    expect(allowsLandingExperience(IntegrationMode.ODDS_FEED)).toBe(true);
  });
});
