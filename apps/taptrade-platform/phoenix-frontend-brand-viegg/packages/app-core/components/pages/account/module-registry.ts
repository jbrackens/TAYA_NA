import { IntegrationMode } from "../../../lib/integration-mode";
import {
  parseConfigList,
  resolveConfigList,
} from "../../../lib/module-config-parser";

export type AccountModuleId = "personal_details" | "promo_availability";

export type AccountModuleConfig = {
  showPersonalDetails: boolean;
  showPromoAvailability: boolean;
};

const ACCOUNT_MODULE_DEFAULTS: Record<IntegrationMode, AccountModuleId[]> = {
  [IntegrationMode.FULL]: ["personal_details", "promo_availability"],
  [IntegrationMode.MODULE]: ["personal_details", "promo_availability"],
  [IntegrationMode.ODDS_FEED]: ["personal_details", "promo_availability"],
};

const isAccountModuleId = (value: string): value is AccountModuleId =>
  value === "personal_details" || value === "promo_availability";

export const parseAccountModules = (value?: string): AccountModuleId[] =>
  parseConfigList(value, isAccountModuleId);

const toModuleConfig = (moduleIds: AccountModuleId[]): AccountModuleConfig => {
  const selectedModules = new Set(moduleIds);
  return {
    showPersonalDetails: selectedModules.has("personal_details"),
    showPromoAvailability: selectedModules.has("promo_availability"),
  };
};

export const resolveAccountModules = (
  mode: IntegrationMode,
  moduleOverride?: string,
): AccountModuleConfig => {
  const selectedModules = resolveConfigList(
    mode,
    ACCOUNT_MODULE_DEFAULTS,
    moduleOverride,
    isAccountModuleId,
  );
  return toModuleConfig(selectedModules);
};
