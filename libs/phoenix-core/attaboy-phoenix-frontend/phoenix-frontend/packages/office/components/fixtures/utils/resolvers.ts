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
  const enums = inverseEnum(FixtureStatusEnum);
  const colors = enumToObject(TalonFixtureStatusColor);
  try {
    return colors[enums[status]];
  } catch (e) {
    return TalonFixtureStatusColor.UNKNOWN;
  }
};
