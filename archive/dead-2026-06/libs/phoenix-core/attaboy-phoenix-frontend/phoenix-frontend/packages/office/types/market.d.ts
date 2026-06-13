import {
  Market,
  MarketDetails,
  MarketDetailsWinner,
  MarketFixtureDetails,
  MarketLifecycle,
  MoneyValue,
} from "@phoenix-ui/utils";
import { Overwrite } from "utility-types";
import { TalonCompetitorScoreHistory } from "./competitor";
import { TalonFixtureScoreHistory } from "./fixture";

export type TalonMarketsFixture = Overwrite<
  MarketsFixture,
  {
    markets: TalonMarket[];
  }
> &
  TalonFixtureScoreHistory;

export type TalonSingleMarketFixture = Overwrite<
  SingleMarketFixture,
  {
    market: TalonMarket;
  }
> &
  TalonFixtureScoreHistory;

export type TalonMarket = Market & {
  marketId: string;
  exposure: MoneyValue;
  lifecycleChanges: TalonMarketLifecycle[];
};

export type TalonMarketLifecycle = {
  lifecycle: MarketLifecycle;
  updatedAt: string;
};

export enum TalonMarketLifecycleTypeColor {
  UNKNOWN = "gray",
  BETTABLE = "green",
  NOT_BETTABLE = "yellow",
  SETTLED = "green",
  RESETTLED = "green",
  CANCELLED = "red",
}

export enum MarketVisibilityEnum {
  DISABLED = "DISABLED",
  ENABLED = "ENABLED",
  FEATURED = "FEATURED",
}

export type MarketVisibility =
  | MarketVisibilityEnum.DISABLED
  | MarketVisibilityEnum.ENABLED
  | MarketVisibilityEnum.FEATURED;

export type MarketCategory = {
  marketCategory: string;
  visibility: MarketVisibility;
};

export type MarketCategories = Array<MarketCategory>;
