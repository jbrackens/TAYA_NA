import { FixtureStatus, FixtureStatusEnum } from "@phoenix-ui/utils";

const SUSPEND_ACTION_DISALLOWED: FixtureStatus[] = [
  FixtureStatusEnum.GAME_ABANDONED,
  FixtureStatusEnum.POST_GAME,
];

export const canSuspend = (status: FixtureStatus): boolean =>
  !SUSPEND_ACTION_DISALLOWED.includes(status);
