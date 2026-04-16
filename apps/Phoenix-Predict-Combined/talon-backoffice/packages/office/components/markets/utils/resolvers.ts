import {
  MarketLifecycleType,
  MarketLifecycleTypeEnum,
} from "@phoenix-ui/utils";
import { enumToObject, inverseEnum } from "../../../lib/utils/enums";
import { buildTableFilterOptions } from "../../../lib/utils/filters";
import { TalonMarketLifecycleTypeColor } from "../../../types/market.d";

export const resolveLifecycle = (
  status: MarketLifecycleType,
  prefix?: string,
) => {
  const valuesToKeys = inverseEnum(MarketLifecycleTypeEnum);
  return {
    color: resolveMarketLifecycleColor(status),
    tKey: `${prefix ? `${prefix}_` : ""}${valuesToKeys[status]}`,
  };
};

export const composeLifecycleOptions = (t: any, prefix?: string) =>
  buildTableFilterOptions(enumToObject(MarketLifecycleTypeEnum), t, prefix);

export const resolveMarketLifecycleColor = (
  type: MarketLifecycleType,
): TalonMarketLifecycleTypeColor => {
  const enums = inverseEnum(MarketLifecycleTypeEnum);
  const colors = enumToObject(TalonMarketLifecycleTypeColor);
  try {
    return colors[enums[type]];
  } catch (e) {
    return TalonMarketLifecycleTypeColor.UNKNOWN;
  }
};
