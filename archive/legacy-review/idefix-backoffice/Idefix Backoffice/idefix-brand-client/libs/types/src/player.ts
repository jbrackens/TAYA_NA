import {
  CurrencyISO,
  SubscriptionType,
  LimitPeriodType,
  LimitLength,
  LimitTypes
} from "./constants";
import { Banners } from "./banners";

export interface Balance {
  CurrentBonusBalance?: string;
  CurrentRealBalance?: string;
  CurrentTotalBalance?: string;
  BareTotalBalance?: string;
  ActivationNeeded?: boolean;
  Activated?: boolean;
}

export interface Profile {
  FirstName: string;
  Address1: string;
  LastName: string;
  EmailAddress: string;
  PostCode: string;
  City: string;
  LanguageISO: string;
  MobilePhone: string;
  CountryISO: string;
  CurrencyISO: CurrencyISO;
  Country: {
    CountryID: string;
    CountryISO: string;
    CountryName: string;
    CurrencyISO: CurrencyISO;
  };
  Pnp: boolean;
}

export interface Player {
  FirstName: string;
  CountryISO: string;
  CurrencyISO: CurrencyISO;
  currencySymbol: string;
  username: string;
  email: string;
  languageISO: string;
}

export interface Exclusion {
  limitId: string;
  limitLength: LimitLength;
  limitType: LimitTypes;
  expires: string;
  canBeCancelled: boolean;
  isPermanent: boolean;
  limitPeriodType?: LimitPeriodType | null;
  limitValue?: number;
  limitLeft?: number;
  limitDate?: string | null;
  isInternal?: boolean;
}

export interface SubmitExclusion {
  limitType: Exclusion["limitType"];
  limitLength: Exclusion["limitLength"];
  limitPeriodType?: LimitPeriodType;
  limitValue?: Exclusion["limitValue"];
}

export interface ApiExclusion {
  minDepositLimit: number;
  limits: Exclusion[];
}

export interface SubscriptionV2 {
  playerId: string;
  email: string;
  emails: SubscriptionType;
  emailsSnoozed: boolean;
  smses: SubscriptionType;
  smsesSnoozed: boolean;
  ok?: boolean;
  result?: string;
}

export type UpdateSubscriptionV2 =
  | { smses: SubscriptionType }
  | { emails: SubscriptionType };

export interface SnoozeSubscriptionV2 {
  type: "email" | "sms";
  revertSnooze?: boolean;
}

export interface LimitLengthWithText {
  time: LimitLength;
  message: string;
}

export interface Details {
  // Luckydino
  rewardsCount?: number;
  // Jefe
  VIPLevel?: number;
  bountiesCount?: number;
  spinCount?: number;
  // Kalevala + Olaspill
  coinBalance?: {
    iron: number;
    gold: number;
  };
  // common
  shopItems?: boolean;
  timestamp?: number;
}

export interface Update {
  details: Details;
  banners: Banners;
  balance: Balance;
  notificationCount: number;
  pendingWithdraws: number;
  scripts?: string[];
  callbacks?: string[];
  executes?: string[];
}

export type UpdateState = Update & {
  serverExecutes: string[];
  serverCallbacks: string[];
  serverScripts: string[];
};

export interface TermsConditions {
  content: string;
}

export interface Notification {
  id: string;
  unread: boolean;
  important: boolean;
  extract: string;
  action: string;
  image: string;
  title: string;
  content: string;
  disclaimer: string;
  actiontext: string;
  openOnLogin: boolean;
}
