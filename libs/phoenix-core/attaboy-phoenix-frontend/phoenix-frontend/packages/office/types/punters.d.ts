import { Punter, PunterDetails, Id } from "@phoenix-ui/utils";

export type TalonPunterShort = Punter & {};

export type TalonPunter = PunterDetails & {
  twoFactorAuthEnabled: boolean;
  hasActiveSession: boolean;
};

export type TalonPunterLimits = {
  [key in TalonPunterLimitsTypesEnum]?: TalonPunterLimitsScope;
};

export enum TalonPunterLimitsTypesEnum {
  DEPOSITS = "deposits",
  STAKE = "stake",
  SESSION = "session",
}

export type TalonPunterWalletItem = WalletHistoryActionElement & {
  punter?: TalonPunter;
};
export type TalonPunterWallet = TalonPunterWalletItem[];

export enum TalonPunterActivityEnum {
  BET_PLACEMENT = "BET_PLACEMENT",
  BET_WON = "BET_WON",
  SYSTEM_LOGIN = "SYSTEM_LOGIN",
}

export type TalonPunterActivity =
  | TalonPunterActivityEnum.SYSTEM_LOGIN
  | TalonPunterActivityEnum.BET_PLACEMENT
  | TalonPunterActivityEnum.BET_WON;

export type TalonPunterRecentActivityItem = {
  id: Id;
  date: string;
  type: TalonPunterActivity;
  message: string;
  data: TalonPunterRecentActivityItemData;
};

export type TalonPunterRecentActivityItemData = {
  [key: string]: any;
};

export type TalonPunterAuditLogAdjustment = TalonPunterAuditLogCore & {
  userId: Id;
  action: string;
  reason: string;
  dataBefore: Object;
  dataAfter: Object;
};

export type TalonPunterSessionHistory = TalonPunterSessionHistoryItem[];

export type TalonPunterSessionHistoryItem = {
  sessionId: Id;
  startTime: string;
  endTime: string;
  details: TalonPunterSessionHistoryItemDetails;
};

export type TalonPunterSessionHistoryItemDetails = {
  [key: string]: number | string;
};

export type TalonPunterNotes = TalonPunterNotesItem[];

export enum TalonPunterNotesTypeEnum {
  MANUAL = "MANUAL",
  SYSTEM = "SYSTEM",
}

export type TalonPunterNotesType =
  | TalonPunterNotesTypeEnum.MANUAL
  | TalonPunterNotesTypeEnum.SYSTEM;

export type TalonPunterNotesAuthor = {
  firstName: string;
  lastName: string;
};

export type TalonPunterNotesItem = {
  noteId: Id;
  createdAt: string;
  authorId: Id;
  authorName: TalonNoteAuthor;
  noteType: TalonPunterNotesType;
  text: string;
};

export enum PeriodEnum {
  DAY = "DAY",
  MONTH = "MONTH",
  WEEK = "WEEK",
}

export type PeriodType = PeriodEnum.DAY | PeriodEnum.MONTH | PeriodEnum.WEEK;

export enum LimitTypeEnum {
  DEPOSIT_AMOUNT = "DEPOSIT_AMOUNT",
  STAKE_AMOUNT = "STAKE_AMOUNT",
  SESSION_TIME = "SESSION_TIME",
}

export type LimitType =
  | LimitTypeEnum.DEPOSIT_AMOUNT
  | LimitTypeEnum.STAKE_AMOUNT
  | LimitTypeEnum.SESSION_TIME;

export type LimitsHistoryData = {
  period: PeriodType;
  limit: string;
  effectiveFrom: string;
  limitType: LimitType;
  requestedAt: string;
};

enum CoolOffCauseEnum {
  SELF_INITIATED = "SELF_INITIATED",
  SESSION_LIMIT_BREACH = "SESSION_LIMIT_BREACH",
}

type CoolOffCause =
  | CoolOffCauseEnum.SELF_INITIATED
  | CoolOffCauseEnum.SESSION_LIMIT_BREACH;

export type CoolOffsHistoryData = {
  punterId: string;
  coolOffStart: string;
  coolOffEnd: string;
  coolOffCause: CoolOffCause;
};
