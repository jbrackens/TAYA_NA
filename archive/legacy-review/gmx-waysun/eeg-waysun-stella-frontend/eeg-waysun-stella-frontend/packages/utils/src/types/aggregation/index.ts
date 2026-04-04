export enum IntervalEnum {
  MINUTES = "MINUTES",
  HOURS = "HOURS",
  DAYS = "DAYS",
  MONTHS = "MONTHS",
  NEVER = "NEVER",
}

export type IntervalType =
  | IntervalEnum.DAYS
  | IntervalEnum.HOURS
  | IntervalEnum.MINUTES
  | IntervalEnum.MONTHS
  | IntervalEnum.NEVER;

export type ResetFrequencyType = {
  interval: IntervalType;
  windowStartDateUTC: string;
  intervalDetails: {
    length: number;
    windowCountLimit: number;
  };
};

export enum AggregationTypeEnum {
  MIN = "MIN",
  MAX = "MAX",
  SUM = "SUM",
  COUNT = "COUNT",
}

export type AggregationType =
  | AggregationTypeEnum.COUNT
  | AggregationTypeEnum.MAX
  | AggregationTypeEnum.MIN
  | AggregationTypeEnum.SUM;

export enum ConditionTypeEnum {
  EQ = "EQ",
  NEQ = "NEQ",
  LT = "LT",
  LE = "LE",
  GT = "GT",
  GE = "GE",
  NN = "NN",
}

export type ConditionType =
  | ConditionTypeEnum.EQ
  | ConditionTypeEnum.NEQ
  | ConditionTypeEnum.LE
  | ConditionTypeEnum.LT
  | ConditionTypeEnum.GT
  | ConditionTypeEnum.GE
  | ConditionTypeEnum.NN;

export type AggregationConditionType = {
  eventFieldName: string;
  conditionType: ConditionType;
  value: string;
};

export type AggregationObjectType = {
  aggregationRuleId: string;
  name: string;
  description: string;
  eventConfigurationId: string;
  resetFrequency: ResetFrequencyType;
  aggregationType: AggregationType;
  aggregationFieldName: string;
  aggregationGroupByFieldName: string;
  aggregationConditions: Array<AggregationConditionType>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AggregationGetResponseType = {
  status: string;
  details: Array<AggregationObjectType>;
};

export type AggregationPostResponseType = {
  status: string;
  details: AggregationObjectType;
};

export type ProjectClient = {
  clientId: string;
  name: string;
};

export type ProjectObjectType = {
  name: string;
  description: string;
  projectId: string;
  kid: string;
  clients: {
    master: Array<ProjectClient>;
    additional: Array<ProjectClient>;
  };
};

export type ProjectGetResponseType = {
  status: string;
  details: Array<ProjectObjectType>;
};
