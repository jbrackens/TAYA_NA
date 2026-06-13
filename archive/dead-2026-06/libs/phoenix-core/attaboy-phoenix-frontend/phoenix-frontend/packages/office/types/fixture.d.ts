import { TalonCompetitorScoreHistory } from "./competitor";
import { TalonMarketsFixture } from "./market";

export type TalonFixture = TalonMarketsFixture;

export type TalonFixtureScoreHistory = {
  scoreHistory: TalonCompetitorScoreHistory[];
};

export enum TalonFixtureStatusColor {
  NOT_STARTED = "gray",
  LIVE = "green",
  SUSPENDED = "red",
  ENDED = "green",
  FINISHED = "green",
  CANCELLED = "red",
  ABANDONED = "red",
  DELAYED = "yellow",
  UNKNOWN = "gray",
  POSTPONED = "geekblue",
  INTERRUPTED = "red",
}
