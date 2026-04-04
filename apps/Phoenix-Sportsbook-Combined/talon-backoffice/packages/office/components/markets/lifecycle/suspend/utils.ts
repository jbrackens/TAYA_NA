import {
  MarketLifecycleType,
  MarketLifecycleTypeEnum,
} from "@phoenix-ui/utils";

// Only show suspend/reopen for states where the Go backend allows the transition.
// open -> suspended (suspend) and suspended -> open (reopen) are valid.
// settled, cancelled, unknown are terminal or invalid — hide the button.
const SUSPEND_ACTION_ALLOWED: MarketLifecycleType[] = [
  MarketLifecycleTypeEnum.BETTABLE,      // open
  MarketLifecycleTypeEnum.NOT_BETTABLE,   // suspended
];

export const canSuspend = (status: MarketLifecycleType): boolean =>
  SUSPEND_ACTION_ALLOWED.includes(status);
