import { IdAndName } from "../common/default";
import { Sport } from "../common/sport";
import { CompetitorScore, Competitor } from "../competitor/index";

type Ids =
  | {
      fixtureId: string;
      fixtureName: string;
    }
  | IdAndName;

export type Fixture = Ids & {
  competitors: Competitor[];
  isLive: boolean;
  score: CompetitorScore;
  sport: Sport;
  startTime: string;
  status: FixtureStatus;
};

export enum FixtureStatusEnum {
  PRE_GAME = "PRE_GAME",
  IN_PLAY = "IN_PLAY",
  POST_GAME = "POST_GAME",
  GAME_ABANDONED = "GAME_ABANDONED",
  BREAK_IN_PLAY = "BREAK_IN_PLAY",
  UNKNOWN = "UNKNOWN",
}

export type FixtureStatus =
  | FixtureStatusEnum.PRE_GAME
  | FixtureStatusEnum.IN_PLAY
  | FixtureStatusEnum.POST_GAME
  | FixtureStatusEnum.GAME_ABANDONED
  | FixtureStatusEnum.BREAK_IN_PLAY;
