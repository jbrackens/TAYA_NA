import { CurrencyISO, DepositOptionIcon } from "./constants";
import { Bonus, FreeSpin, Campaign } from "./bonuses";

export interface DepositMethodOption {
  bank_name: string;
  id: string;
  logo: string;
}

export interface Deposit {
  numDeposits: number;
  depositMethods: DepositMethod[];
  depositOptions: DepositOptions;
  limit?: DepositLimit;
}

export interface DepositOptions {
  bonus?: Bonus;
  campaign?: Campaign;
  freespins?: FreeSpin[];
  amounts?: number[];
  freespinsSeparator?: boolean;
}

export interface DepositLimit {
  key: string;
  description: string;
  canBeCancelled: boolean;
  expireTime: string;
  permanent: boolean;
  limitLeft: number;
  isInternal: boolean;
  expires: string;
}

export interface DepositMethod {
  PlayerLowerLimit: number;
  PlayerUpperLimit: number;
  currencyISO: CurrencyISO;
  currencySymbol: string;
  id: string;
  uid: string;
  lowerLimit: number;
  lowerLimit_formatted: string;
  name: string;
  options?: DepositMethodOption[];
  priority: number;
  title: string;
  type: string;
  upperLimit: number;
  upperLimit_formatted: string;
  disabledWithBonus: boolean;
  accountId?: number;
  account?: string;
  fee?: string;
  copyrightText?: string;
  amounts: number[];
}

export interface DepositOption {
  id: string;
  toggle: "on" | "off" | "disabled";
  icon: DepositOptionIcon;
  title:
    | string
    | {
        text: string;
      };
  fields: { key: string; value: string }[];
  minAmount?: number;
  freespins?: FreeSpin[];
  amounts?: number[];
  freespinsSeparator?: boolean;
}

export interface CreateDepositResponse {
  ReturnURL?: string;
  usesThirdPartyCookie?: boolean;
  result?: string;
  ok?: boolean;
  iframe?: boolean;
  force?: boolean;
  options?: {
    url: string;
  };
}
