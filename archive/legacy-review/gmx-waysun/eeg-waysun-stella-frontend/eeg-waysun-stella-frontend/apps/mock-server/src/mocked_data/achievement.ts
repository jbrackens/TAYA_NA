import {
  AchievementConfigurationType,
  AchievementType,
  AchievementWindowsType,
  ActionTypeEnum,
  ConditionTypeEnum,
  OperationEnum,
} from "utils";

export const achievementConfigurationPayload: AchievementConfigurationType = {
  achievementRuleId: "ff3ba84b-070d-4ecd-9989-f8f23bd193d9",
  achievementName: "daily_sum_over_1000",
  action: {
    actionType: ActionTypeEnum.EVENT,
    payload: {
      eventId: "daily_sum_over_1000_event",
      setFields: [
        {
          fieldName: "player_name",
          operation: OperationEnum.REPLACE_FROM,
          value: "group_by_field_value",
        },
        {
          fieldName: "daily_sum",
          operation: OperationEnum.REPLACE_FROM,
          value: "sum",
        },
      ],
    },
  },
  description: "test",
  conditions: [
    {
      aggregationRuleId: "1ca3f488-bd76-41af-9d29-87a4d18b7c86",
      aggregationField: "sum",
      conditionType: ConditionTypeEnum.GT,
      value: "1000",
    },
    {
      aggregationRuleId: "1ca3f488-bd76-41af-9d29-87a4d18b7c86",
      aggregationField: "max",
      conditionType: ConditionTypeEnum.GT,
      value: "1000",
    },
  ],
  isActive: true,
  createdAt: "2021-01-23T01:23:45.678+09:00",
  updatedAt: "2021-01-23T01:34:40.112+09:00",
};

export const achievementWindowPayload: AchievementWindowsType = {
  windowsRangeStart: "2021-01-23T01:00:00.000+00:00",
  windowsRangeEnd: "2021-01-23T02:00:00.000+00:00",
  elements: 12,
};

export const achievementsPayload: AchievementType = {
  pageNumber: 1,
  numberOfPages: 2,
  pageSize: 3,
  results: [
    {
      position: 1,
      achievementOriginDate: "2021-01-23T01:34:40.112+00:00",
      groupByFieldValue: "Ronaldo123",
      action: "",
      createdAt: "2021-01-23T01:34:45.678+00:00",
    },
    {
      position: 2,
      achievementOriginDate: "2021-01-23T01:34:40.112+00:00",
      groupByFieldValue: "Ronaldo123",
      action: "",
      createdAt: "2021-01-23T01:34:45.678+00:00",
    },
  ],
};
