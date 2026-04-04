import { AggregationObjectType, AggregationTypeEnum, ConditionTypeEnum, IntervalEnum } from "utils"

export const AggregationGETPayload: AggregationObjectType = {
  "aggregationRuleId": "f3bd81ef-252e-4a1c-adef-464e6455cadc",
  "name": "number_of_headshots_on_map_hidden_tiger",
  "description": "Monthly number of head shots per player on map 'Hidden tiger'",
  "eventConfigurationId": "b35e98b2-b9c3-4983-85a5-3626b7756d49",
  "resetFrequency": {
    "interval": IntervalEnum.MONTHS,
    "windowStartDateUTC": "2022-02-16T12:38:30.429Z",
    'intervalDetails':{
      "length": 1,
      "windowCountLimit": 1,
    }
  },
  "aggregationType": AggregationTypeEnum.MAX,
  "aggregationFieldName": "scoreboard.player.headshots",
  "aggregationGroupByFieldName": "scoreboard.player.nickname",
  "aggregationConditions": [
    {
      "eventFieldName": "scoreboard.map.name",
      "conditionType": ConditionTypeEnum.EQ,
      "value": "Hidden Tiger"
    }
  ],
  "isActive": true,
  "createdAt": "2021-01-23T01:23:45.678+09:00",
  "updatedAt": "2021-01-23T01:34:40.112+09:00"
};