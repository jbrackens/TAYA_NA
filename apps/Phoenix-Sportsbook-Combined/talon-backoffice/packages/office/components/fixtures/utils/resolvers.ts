import { FixtureStatus, FixtureStatusEnum } from "@phoenix-ui/utils";
import { enumToObject, inverseEnum } from "../../../lib/utils/enums";
import { buildTableFilterOptions } from "../../../lib/utils/filters";
import { TalonFixtureStatusColor } from "../../../types/fixture.d";

export const resolveStatus = (status: FixtureStatus, prefix?: string) => {
  const valuesToKeys = inverseEnum(FixtureStatusEnum);
  return {
    color: resolveFixtureStatusColor(status),
    tKey: `${prefix ? `${prefix}_` : ""}${valuesToKeys[status]}`,
  };
};

export const composeOptions = (t: any, prefix?: string) =>
  buildTableFilterOptions(enumToObject(FixtureStatusEnum), t, prefix);

export const resolveFixtureStatusColor = (
  status: FixtureStatus,
): TalonFixtureStatusColor => {
  switch (status) {
    case FixtureStatusEnum.PRE_GAME:
      return TalonFixtureStatusColor.NOT_STARTED;
    case FixtureStatusEnum.IN_PLAY:
      return TalonFixtureStatusColor.LIVE;
    case FixtureStatusEnum.POST_GAME:
      return TalonFixtureStatusColor.FINISHED;
    case FixtureStatusEnum.GAME_ABANDONED:
      return TalonFixtureStatusColor.ABANDONED;
    case FixtureStatusEnum.BREAK_IN_PLAY:
      return TalonFixtureStatusColor.SUSPENDED;
    default:
      return TalonFixtureStatusColor.UNKNOWN;
  }
};
