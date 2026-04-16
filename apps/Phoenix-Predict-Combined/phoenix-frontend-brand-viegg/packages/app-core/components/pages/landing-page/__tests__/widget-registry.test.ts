import { IntegrationMode } from "../../../../lib/integration-mode";
import {
  parseLandingWidgetList,
  resolveLandingWidgets,
} from "../widget-registry";

describe("landing page widget registry", () => {
  test("uses mode defaults when no override is provided", () => {
    expect(resolveLandingWidgets(IntegrationMode.FULL).length).toBe(4);
    expect(resolveLandingWidgets(IntegrationMode.MODULE).length).toBe(2);
    expect(resolveLandingWidgets(IntegrationMode.ODDS_FEED).length).toBe(1);
  });

  test("parses and deduplicates valid override widget list", () => {
    expect(
      parseLandingWidgetList(
        "about_vie,features_and_modes,about_vie,unknown,esports_offering",
      ),
    ).toEqual(["about_vie", "features_and_modes", "esports_offering"]);
  });

  test("override list replaces mode default order", () => {
    const sections = resolveLandingWidgets(
      IntegrationMode.ODDS_FEED,
      "features_and_modes,about_vie",
    );
    expect(sections.length).toBe(2);
    expect(sections[0].heading).toBe("FEATURES AND MODES");
    expect(sections[1].heading).toBe("VIE GO BEYOND THE BET");
  });
});
