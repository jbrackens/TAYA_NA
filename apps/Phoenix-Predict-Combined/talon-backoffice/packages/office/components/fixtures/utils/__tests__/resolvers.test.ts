import { FixtureStatusEnum } from "@phoenix-ui/utils";
import {
  resolveFixtureStatusColor,
  resolveStatus,
} from "../resolvers";
import { TalonFixtureStatusColor } from "../../../../types/fixture.d";

describe("fixture resolvers", () => {
  test("maps Talon fixture enums to display colors", () => {
    expect(resolveFixtureStatusColor(FixtureStatusEnum.PRE_GAME)).toBe(
      TalonFixtureStatusColor.NOT_STARTED,
    );
    expect(resolveFixtureStatusColor(FixtureStatusEnum.IN_PLAY)).toBe(
      TalonFixtureStatusColor.LIVE,
    );
    expect(resolveFixtureStatusColor(FixtureStatusEnum.POST_GAME)).toBe(
      TalonFixtureStatusColor.FINISHED,
    );
    expect(resolveFixtureStatusColor(FixtureStatusEnum.GAME_ABANDONED)).toBe(
      TalonFixtureStatusColor.ABANDONED,
    );
    expect(resolveFixtureStatusColor(FixtureStatusEnum.BREAK_IN_PLAY)).toBe(
      TalonFixtureStatusColor.SUSPENDED,
    );
  });

  test("returns the expected translation key prefix for normalized statuses", () => {
    expect(resolveStatus(FixtureStatusEnum.PRE_GAME, "CELL_STATUS")).toEqual({
      color: TalonFixtureStatusColor.NOT_STARTED,
      tKey: "CELL_STATUS_PRE_GAME",
    });
    expect(resolveStatus(FixtureStatusEnum.IN_PLAY, "CELL_STATUS")).toEqual({
      color: TalonFixtureStatusColor.LIVE,
      tKey: "CELL_STATUS_IN_PLAY",
    });
  });
});
