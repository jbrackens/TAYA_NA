import { IntegrationMode } from "../../../../lib/integration-mode";
import {
  parseEsportsHomeModules,
  resolveEsportsHomeModules,
} from "../module-registry";

describe("esports home module registry", () => {
  test("resolves mode defaults", () => {
    expect(resolveEsportsHomeModules(IntegrationMode.FULL)).toEqual({
      showPromos: true,
      showTabs: true,
      showResultsTab: true,
      showFixtures: true,
      showOddsFormatSelect: true,
    });

    expect(resolveEsportsHomeModules(IntegrationMode.MODULE)).toEqual({
      showPromos: false,
      showTabs: true,
      showResultsTab: true,
      showFixtures: true,
      showOddsFormatSelect: true,
    });

    expect(resolveEsportsHomeModules(IntegrationMode.ODDS_FEED)).toEqual({
      showPromos: false,
      showTabs: false,
      showResultsTab: false,
      showFixtures: true,
      showOddsFormatSelect: true,
    });
  });

  test("parses and deduplicates override module list", () => {
    expect(
      parseEsportsHomeModules(
        "fixtures,tabs,fixtures,promo_carousel,invalid,odds_format_select",
      ),
    ).toEqual(["fixtures", "tabs", "promo_carousel", "odds_format_select"]);
  });

  test("override list replaces mode defaults", () => {
    expect(
      resolveEsportsHomeModules(
        IntegrationMode.FULL,
        "fixtures,odds_format_select",
      ),
    ).toEqual({
      showPromos: false,
      showTabs: false,
      showResultsTab: false,
      showFixtures: true,
      showOddsFormatSelect: true,
    });
  });
});
