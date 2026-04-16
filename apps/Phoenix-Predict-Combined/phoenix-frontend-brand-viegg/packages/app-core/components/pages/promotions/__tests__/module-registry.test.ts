import { IntegrationMode } from "../../../../lib/integration-mode";
import {
  parsePromotionsModules,
  resolvePromotionsModules,
} from "../module-registry";

describe("promotions module registry", () => {
  test("resolves mode defaults", () => {
    expect(resolvePromotionsModules(IntegrationMode.FULL)).toEqual({
      showPageContent: true,
      showPromoAvailability: true,
    });

    expect(resolvePromotionsModules(IntegrationMode.MODULE)).toEqual({
      showPageContent: true,
      showPromoAvailability: true,
    });

    expect(resolvePromotionsModules(IntegrationMode.ODDS_FEED)).toEqual({
      showPageContent: true,
      showPromoAvailability: true,
    });
  });

  test("parses and deduplicates override module list", () => {
    expect(
      parsePromotionsModules(
        "promo_availability,page_content,promo_availability,invalid",
      ),
    ).toEqual(["promo_availability", "page_content"]);
  });

  test("override list replaces mode defaults", () => {
    expect(
      resolvePromotionsModules(IntegrationMode.FULL, "promo_availability"),
    ).toEqual({
      showPageContent: false,
      showPromoAvailability: true,
    });
  });
});
