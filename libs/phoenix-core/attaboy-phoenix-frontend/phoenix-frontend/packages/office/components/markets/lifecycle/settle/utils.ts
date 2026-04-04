import {
  MarketLifecycleType,
  MarketLifecycleTypeEnum,
} from "@phoenix-ui/utils";

const SETTLE_STATUS_ACTION_ALLOWED: MarketLifecycleType[] = [
  MarketLifecycleTypeEnum.BETTABLE,
];
const RESETTLE_STATUS_ACTION_ALLOWED: MarketLifecycleType[] = [
  MarketLifecycleTypeEnum.SETTLED,
  MarketLifecycleTypeEnum.RESETTLED,
];

export const canSettle = (status: MarketLifecycleType): boolean =>
  SETTLE_STATUS_ACTION_ALLOWED.includes(status);

export const canReSettle = (status: MarketLifecycleType): boolean =>
  RESETTLE_STATUS_ACTION_ALLOWED.includes(status);
