import { FixtureStatus, FixtureStatusEnum } from "@phoenix-ui/utils";

const CANCEL_ACTION_DISALLOWED: FixtureStatus[] = [
  FixtureStatusEnum.GAME_ABANDONED,
  FixtureStatusEnum.POST_GAME,
];

export const canCancel = (status: FixtureStatus): boolean =>
  !CANCEL_ACTION_DISALLOWED.includes(status);
