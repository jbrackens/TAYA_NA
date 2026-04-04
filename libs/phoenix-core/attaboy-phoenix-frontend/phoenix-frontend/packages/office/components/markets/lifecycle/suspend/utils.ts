import {
  MarketLifecycleType,
  MarketLifecycleTypeEnum,
} from "@phoenix-ui/utils";

const SUSPEND_ACTION_DISALLOWED: MarketLifecycleType[] = [
  MarketLifecycleTypeEnum.CANCELLED,
];

export const canSuspend = (status: MarketLifecycleType): boolean =>
  !SUSPEND_ACTION_DISALLOWED.includes(status);
