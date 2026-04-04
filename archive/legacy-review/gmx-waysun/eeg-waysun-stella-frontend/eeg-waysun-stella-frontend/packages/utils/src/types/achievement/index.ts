import { ConditionType } from "..";

export enum RequestEnum {
  GET = "get",
  POST = "post",
  PUT = "put",
  PATCH = "patch",
  DELETE = "delete",
}

export type RequestType =
  | RequestEnum.GET
  | RequestEnum.POST
  | RequestEnum.PUT
  | RequestEnum.PATCH
  | RequestEnum.DELETE;

export enum ActionTypeEnum {
  EVENT = "event",
  WEBHOOK = "webhook",
}

export type ActionType = ActionTypeEnum.EVENT | ActionTypeEnum.WEBHOOK;

export enum OperationEnum {
  REPLACE_FROM = "replaceFrom",
  STATIC = "static",
}

export enum ReplaceFromValueEnum {
  SUM = "sum",
  MIN = "min",
  MAX = "max",
  COUNT = "count",
  CUSTOM = "custom",
  GROUP_BY_FIELD_VALUE = "groupByFieldValue",
}

export type OperationType = OperationEnum.REPLACE_FROM | OperationEnum.STATIC;

export type SetFieldType = {
  fieldName: string;
  operation: OperationType;
  value: string;
  aggregationRuleId?: string;
};

export interface EventAction {
  actionType: ActionTypeEnum.EVENT;
  payload: {
    eventId: string;
    setFields: Array<SetFieldType>;
  };
}

export interface WebhookAction {
  actionType: ActionTypeEnum.WEBHOOK;
  payload: {
    requestType: RequestType;
    targetUrl: string;
    eventConfig: {
      eventId: string;
      setFields: Array<SetFieldType>;
    };
  };
}

export type ActionObjectType = EventAction | WebhookAction;

export type ConditionObjectType = {
  aggregationRuleId: string;
  aggregationField: string;
  conditionType: ConditionType;
  value: string;
};

export type AchievementConfigurationType = {
  achievementRuleId: string;
  achievementName: string;
  description: string;
  action: ActionObjectType;
  conditions: Array<ConditionObjectType>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AchievementGetResponseType = {
  status: string;
  details: Array<AchievementConfigurationType>;
};

export type AchievementPostResponseType = {
  status: string;
  details: AchievementConfigurationType;
};

export type AchievementWindowsType = {
  windowsRangeStart: string;
  windowsRangeEnd: string;
  elements: number;
};

export type AchievementWindowsResponseType = {
  status: string;
  results: Array<AchievementWindowsType>;
};

export type AchievementResult = {
  position: number;
  achievementOriginDate: string;
  groupByFieldValue: string;
  // to change once swagger available
  action: any;
  createdAt: string;
};

export type AchievementType = {
  pageNumber: number;
  numberOfPages: number;
  pageSize: number;
  results: Array<AchievementResult>;
};

export type AchievementResponseType = {
  status: string;
  results: AchievementType;
};
