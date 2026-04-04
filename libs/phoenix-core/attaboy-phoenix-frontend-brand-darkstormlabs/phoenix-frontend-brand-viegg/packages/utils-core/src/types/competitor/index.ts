export type Competitor = {
  competitorId: string;
  abbreviation: string;
  name: string;
  qualifier: CompetitorQualifier;
};

export enum CompetitorQualifierEnum {
  HOME = "home",
  AWAY = "away",
}

export type CompetitorQualifier =
  | CompetitorQualifierEnum.HOME
  | CompetitorQualifierEnum.AWAY;

export type CompetitorScore = {
  [CompetitorQualifierEnum.HOME]: number;
  [CompetitorQualifierEnum.AWAY]: number;
};
