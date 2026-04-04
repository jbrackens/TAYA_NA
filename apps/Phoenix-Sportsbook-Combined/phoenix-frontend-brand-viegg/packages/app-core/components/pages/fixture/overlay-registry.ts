import { IntegrationMode } from "../../../lib/integration-mode";
import {
  parseConfigList,
  resolveConfigList,
} from "../../../lib/module-config-parser";

export type FixtureOverlayId =
  | "stale_warning"
  | "match_tracker"
  | "stats_centre";

export type FixtureOverlayConfig = {
  showStaleWarning: boolean;
  showMatchTracker: boolean;
  showStatsCentre: boolean;
};

const FIXTURE_OVERLAY_DEFAULTS: Record<IntegrationMode, FixtureOverlayId[]> = {
  [IntegrationMode.FULL]: ["stale_warning", "match_tracker", "stats_centre"],
  [IntegrationMode.MODULE]: ["stale_warning", "match_tracker", "stats_centre"],
  [IntegrationMode.ODDS_FEED]: [],
};

const isFixtureOverlayId = (value: string): value is FixtureOverlayId =>
  value === "stale_warning" ||
  value === "match_tracker" ||
  value === "stats_centre";

export const parseFixtureOverlayList = (value?: string): FixtureOverlayId[] =>
  parseConfigList(value, isFixtureOverlayId);

const toOverlayConfig = (overlayIds: FixtureOverlayId[]): FixtureOverlayConfig => {
  const selectedOverlays = new Set(overlayIds);
  return {
    showStaleWarning: selectedOverlays.has("stale_warning"),
    showMatchTracker: selectedOverlays.has("match_tracker"),
    showStatsCentre: selectedOverlays.has("stats_centre"),
  };
};

export const resolveFixtureOverlays = (
  mode: IntegrationMode,
  overlayOverride?: string,
): FixtureOverlayConfig => {
  const selectedOverlays = resolveConfigList(
    mode,
    FIXTURE_OVERLAY_DEFAULTS,
    overlayOverride,
    isFixtureOverlayId,
  );
  return toOverlayConfig(selectedOverlays);
};
