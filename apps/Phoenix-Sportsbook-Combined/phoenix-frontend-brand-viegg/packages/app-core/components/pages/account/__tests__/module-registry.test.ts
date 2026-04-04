import { IntegrationMode } from "../../../../lib/integration-mode";
import { parseAccountModules, resolveAccountModules } from "../module-registry";

describe("account module registry", () => {
  test("resolves mode defaults", () => {
    expect(resolveAccountModules(IntegrationMode.FULL)).toEqual({
      showPersonalDetails: true,
      showPromoAvailability: true,
    });

    expect(resolveAccountModules(IntegrationMode.MODULE)).toEqual({
      showPersonalDetails: true,
      showPromoAvailability: true,
    });

    expect(resolveAccountModules(IntegrationMode.ODDS_FEED)).toEqual({
      showPersonalDetails: true,
      showPromoAvailability: true,
    });
  });

  test("parses and deduplicates module override values", () => {
    expect(
      parseAccountModules(
        "promo_availability,personal_details,promo_availability,invalid",
      ),
    ).toEqual(["promo_availability", "personal_details"]);
  });

  test("override list replaces mode defaults", () => {
    expect(
      resolveAccountModules(IntegrationMode.FULL, "promo_availability"),
    ).toEqual({
      showPersonalDetails: false,
      showPromoAvailability: true,
    });
  });
});
