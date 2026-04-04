import { IntegrationMode } from "../../../lib/integration-mode";
import {
  parseConfigList,
  resolveConfigList,
} from "../../../lib/module-config-parser";

export type EsportsHomeModuleId =
  | "promo_carousel"
  | "tabs"
  | "results_tab"
  | "fixtures"
  | "odds_format_select";

export type EsportsHomeModuleConfig = {
  showPromos: boolean;
  showTabs: boolean;
  showResultsTab: boolean;
  showFixtures: boolean;
  showOddsFormatSelect: boolean;
};

const ESPORTS_MODULE_DEFAULTS: Record<IntegrationMode, EsportsHomeModuleId[]> = {
  [IntegrationMode.FULL]: [
    "promo_carousel",
    "tabs",
    "results_tab",
    "fixtures",
    "odds_format_select",
  ],
  [IntegrationMode.MODULE]: [
    "tabs",
    "results_tab",
    "fixtures",
    "odds_format_select",
  ],
  [IntegrationMode.ODDS_FEED]: ["fixtures", "odds_format_select"],
};

const isEsportsHomeModuleId = (value: string): value is EsportsHomeModuleId =>
  value === "promo_carousel" ||
  value === "tabs" ||
  value === "results_tab" ||
  value === "fixtures" ||
  value === "odds_format_select";

export const parseEsportsHomeModules = (
  value?: string,
): EsportsHomeModuleId[] => {
  return parseConfigList(value, isEsportsHomeModuleId);
};

const toModuleConfig = (
  moduleIds: EsportsHomeModuleId[],
): EsportsHomeModuleConfig => {
  const moduleSet = new Set(moduleIds);
  return {
    showPromos: moduleSet.has("promo_carousel"),
    showTabs: moduleSet.has("tabs"),
    showResultsTab: moduleSet.has("results_tab"),
    showFixtures: moduleSet.has("fixtures"),
    showOddsFormatSelect: moduleSet.has("odds_format_select"),
  };
};

export const resolveEsportsHomeModules = (
  mode: IntegrationMode,
  moduleOverride?: string,
): EsportsHomeModuleConfig => {
  const selectedModules = resolveConfigList(
    mode,
    ESPORTS_MODULE_DEFAULTS,
    moduleOverride,
    isEsportsHomeModuleId,
  );
  return toModuleConfig(selectedModules);
};
