import { IntegrationMode } from "../../../../lib/integration-mode";
import {
  parseFixtureOverlayList,
  resolveFixtureOverlays,
} from "../overlay-registry";

describe("fixture overlay registry", () => {
  test("resolves mode defaults", () => {
    expect(resolveFixtureOverlays(IntegrationMode.FULL)).toEqual({
      showStaleWarning: true,
      showMatchTracker: true,
      showStatsCentre: true,
    });

    expect(resolveFixtureOverlays(IntegrationMode.MODULE)).toEqual({
      showStaleWarning: true,
      showMatchTracker: true,
      showStatsCentre: true,
    });

    expect(resolveFixtureOverlays(IntegrationMode.ODDS_FEED)).toEqual({
      showStaleWarning: false,
      showMatchTracker: false,
      showStatsCentre: false,
    });
  });

  test("parses and deduplicates valid overlay values", () => {
    expect(
      parseFixtureOverlayList(
        "stats_centre,match_tracker,stats_centre,invalid,stale_warning",
      ),
    ).toEqual(["stats_centre", "match_tracker", "stale_warning"]);
  });

  test("override list replaces mode defaults", () => {
    expect(
      resolveFixtureOverlays(IntegrationMode.FULL, "match_tracker"),
    ).toEqual({
      showStaleWarning: false,
      showMatchTracker: true,
      showStatsCentre: false,
    });
  });

  test("odds feed mode supports explicit overlay enablement", () => {
    expect(
      resolveFixtureOverlays(
        IntegrationMode.ODDS_FEED,
        "stale_warning,match_tracker,stats_centre",
      ),
    ).toEqual({
      showStaleWarning: true,
      showMatchTracker: true,
      showStatsCentre: true,
    });
  });
});
