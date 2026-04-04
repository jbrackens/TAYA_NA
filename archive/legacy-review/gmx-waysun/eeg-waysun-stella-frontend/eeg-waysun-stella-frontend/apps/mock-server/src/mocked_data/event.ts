import { EventType, ValueTypeEnum } from "utils";

export const eventResponse: EventType = {
  "eventId": "f3bd81ef-252e-4a1c-adef-464e6455cadc",
  "name": `EXAMPLE_EVENT_1`,
  "description": "lorem ipsum",
  "isActive": true,
  "fields": [
    {
      "name": "KILLER",
      "valueType": ValueTypeEnum.STRING
    },
    {
      "name": "VICTIM",
      "valueType": ValueTypeEnum.STRING
    },
    {
      "name": "DISTANCE",
      "valueType": ValueTypeEnum.FLOAT
    },
    {
      "name": "HP_LEFT",
      "valueType": ValueTypeEnum.INTEGER
    },
    {
      "name": "SAME_TEAM",
      "valueType": ValueTypeEnum.BOOLEAN
    }
  ],
  "createdAt": "2021-01-23T01:23:45.678+09:00",
  "updatedAt": "2021-01-23T01:34:40.112+09:00"
}

export const postEventResponse: EventType = {
  "eventId": "f3bd81ef-252e-4a1c-adef-464e6455asdasdasda",
  "name": `EXAMPLE_EVENT_2`,
  "description": "lorem ipsum",
  "isActive": true,
  "fields": [
    {
      "name": "KILLER",
      "valueType": ValueTypeEnum.STRING
    },
    {
      "name": "VICTIM",
      "valueType": ValueTypeEnum.STRING
    },
    {
      "name": "DISTANCE",
      "valueType": ValueTypeEnum.FLOAT
    },
    {
      "name": "HP_LEFT",
      "valueType": ValueTypeEnum.INTEGER
    },
    {
      "name": "SAME_TEAM",
      "valueType": ValueTypeEnum.BOOLEAN
    }
  ],
  "createdAt": "2021-01-23T01:23:45.678+09:00",
  "updatedAt": "2021-01-23T01:34:40.112+09:00"
}