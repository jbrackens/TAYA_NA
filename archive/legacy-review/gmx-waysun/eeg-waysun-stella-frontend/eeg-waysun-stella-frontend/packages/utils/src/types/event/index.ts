export enum ValueTypeEnum {
  INTEGER = "Integer",
  FLOAT = "Float",
  STRING = "String",
  BOOLEAN = "Boolean",
}

export type ValueType =
  | ValueTypeEnum.BOOLEAN
  | ValueTypeEnum.FLOAT
  | ValueTypeEnum.INTEGER
  | ValueTypeEnum.STRING;

export type FieldType = {
  name: string;
  valueType: ValueType;
};

export type EventType = {
  eventId: string;
  name: string;
  description: string;
  isActive: boolean;
  fields: Array<FieldType>;
  createdAt: string;
  updatedAt: string;
};

export type EventGetResponseType = {
  status: string;
  details: Array<EventType>;
};

export type EventPostResponseType = {
  status: string;
  details: EventType;
};

export type SendEventType = {
  messageOriginDateUTC: string;
  eventName: string;
  payload: Array<Object>;
};
