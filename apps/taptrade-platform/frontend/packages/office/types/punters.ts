import {
  Punter,
  PunterDetails,
  Id,
  WalletHistoryActionElement,
  PunterStandardLimitsScope,
  PunterSessionLimitsScope,
  PaymentMethodTypeEnum,
} from "@taptrade-ui/utils";

export type OfficePunterShort = Punter & {};

export type OfficePunter = PunterDetails & {
  twoFactorAuthEnabled: boolean;
  hasActiveSession: boolean;
};

export type OfficePunterLimitsScope =
  | PunterStandardLimitsScope
  | PunterSessionLimitsScope;

export type OfficePunterLimits = {
  [key in OfficePunterLimitsTypesEnum]?: OfficePunterLimitsScope;
};

export enum OfficePunterLimitsTypesEnum {
  POINT_ADD = "deposits",
  POINT_USE = "stake",
  SESSION = "session",
}

export type OfficePunterWalletPaymentMethod = {
  type?: PaymentMethodTypeEnum;
  details?: string;
  adminPunterId?: Id;
};

export type OfficePunterWalletItem = WalletHistoryActionElement & {
  punter?: OfficePunter;
  externalId?: string;
  paymentMethod?: OfficePunterWalletPaymentMethod;
};
export type OfficePunterWallet = OfficePunterWalletItem[];

export enum OfficePunterActivityEnum {
  PREDICTION_ORDER = "PREDICTION_ORDER",
  PREDICTION_RESULT = "PREDICTION_RESULT",
  SYSTEM_LOGIN = "SYSTEM_LOGIN",
}

export type OfficePunterActivity =
  | OfficePunterActivityEnum.SYSTEM_LOGIN
  | OfficePunterActivityEnum.PREDICTION_ORDER
  | OfficePunterActivityEnum.PREDICTION_RESULT;

export type OfficePunterRecentActivityItem = {
  id: Id;
  date: string;
  type: OfficePunterActivity;
  message: string;
  data: OfficePunterRecentActivityItemData;
};

export type OfficePunterRecentActivityItemData = {
  [key: string]: any;
};

export type OfficePunterAuditLogCore = {
  id: Id;
  createdAt: string;
};

export type OfficePunterAuditLogAdjustment = OfficePunterAuditLogCore & {
  userId: Id;
  action: string;
  reason: string;
  dataBefore: Object;
  dataAfter: Object;
};

export type OfficePunterSessionHistory = OfficePunterSessionHistoryItem[];

export type OfficePunterSessionHistoryItem = {
  sessionId: Id;
  startTime: string;
  endTime: string;
  details: OfficePunterSessionHistoryItemDetails;
};

export type OfficePunterSessionHistoryItemDetails = {
  [key: string]: number | string;
};

export type OfficePunterNotes = OfficePunterNotesItem[];

export enum OfficePunterNotesTypeEnum {
  MANUAL = "MANUAL",
  SYSTEM = "SYSTEM",
}

export type OfficePunterNotesType =
  | OfficePunterNotesTypeEnum.MANUAL
  | OfficePunterNotesTypeEnum.SYSTEM;

export type OfficePunterNotesAuthor = {
  firstName: string;
  lastName: string;
};

export type OfficePunterNotesItem = {
  noteId: Id;
  createdAt: string;
  authorId: Id;
  authorName: OfficePunterNotesAuthor;
  noteType: OfficePunterNotesType;
  text: string;
};

export enum PeriodEnum {
  DAY = "DAY",
  MONTH = "MONTH",
  WEEK = "WEEK",
}

export type PeriodType = PeriodEnum.DAY | PeriodEnum.MONTH | PeriodEnum.WEEK;

export enum LimitTypeEnum {
  POINT_ADD_AMOUNT = "DEPOSIT_AMOUNT",
  PREDICTION_POINT_AMOUNT = "STAKE_AMOUNT",
  SESSION_TIME = "SESSION_TIME",
}

export type LimitType =
  | LimitTypeEnum.POINT_ADD_AMOUNT
  | LimitTypeEnum.PREDICTION_POINT_AMOUNT
  | LimitTypeEnum.SESSION_TIME;

export type LimitsHistoryData = {
  period: PeriodType;
  limit: string;
  effectiveFrom: string;
  limitType: LimitType;
  requestedAt: string;
};

export enum CoolOffCauseEnum {
  SELF_INITIATED = "SELF_INITIATED",
  SESSION_LIMIT_BREACH = "SESSION_LIMIT_BREACH",
}

export type CoolOffCause =
  | CoolOffCauseEnum.SELF_INITIATED
  | CoolOffCauseEnum.SESSION_LIMIT_BREACH;

export type CoolOffsHistoryData = {
  punterId: string;
  coolOffStart: string;
  coolOffEnd: string;
  coolOffCause: CoolOffCause;
};
