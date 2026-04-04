import {
  MarketLifecycleType,
  MarketLifecycleTypeEnum,
} from "@phoenix-ui/utils";

const CANCEL_ACTION_DISALLOWED: MarketLifecycleType[] = [
  MarketLifecycleTypeEnum.CANCELLED,
];

export const canCancel = (status: MarketLifecycleType): boolean =>
  !CANCEL_ACTION_DISALLOWED.includes(status);
