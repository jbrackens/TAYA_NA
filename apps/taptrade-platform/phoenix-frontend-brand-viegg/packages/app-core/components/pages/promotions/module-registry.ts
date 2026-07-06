import { IntegrationMode } from "../../../lib/integration-mode";
import {
  parseConfigList,
  resolveConfigList,
} from "../../../lib/module-config-parser";

export type PromotionsModuleId = "page_content" | "promo_availability";

export type PromotionsModuleConfig = {
  showPageContent: boolean;
  showPromoAvailability: boolean;
};

const PROMOTIONS_MODULE_DEFAULTS: Record<
  IntegrationMode,
  PromotionsModuleId[]
> = {
  [IntegrationMode.FULL]: ["page_content", "promo_availability"],
  [IntegrationMode.MODULE]: ["page_content", "promo_availability"],
  [IntegrationMode.ODDS_FEED]: ["page_content", "promo_availability"],
};

const isPromotionsModuleId = (value: string): value is PromotionsModuleId =>
  value === "page_content" || value === "promo_availability";

export const parsePromotionsModules = (
  value?: string,
): PromotionsModuleId[] => parseConfigList(value, isPromotionsModuleId);

const toModuleConfig = (
  moduleIds: PromotionsModuleId[],
): PromotionsModuleConfig => {
  const selectedModules = new Set(moduleIds);
  return {
    showPageContent: selectedModules.has("page_content"),
    showPromoAvailability: selectedModules.has("promo_availability"),
  };
};

export const resolvePromotionsModules = (
  mode: IntegrationMode,
  moduleOverride?: string,
): PromotionsModuleConfig => {
  const selectedModules = resolveConfigList(
    mode,
    PROMOTIONS_MODULE_DEFAULTS,
    moduleOverride,
    isPromotionsModuleId,
  );
  return toModuleConfig(selectedModules);
};
