/* @flow */
export type YggdrasilMoney = string;

export type YggdrasilRequest = {
  sessiontoken: string,
  playerid: string,
  org: string,
};

export type GetBalanceRequest = {} & YggdrasilRequest;
export type GetBalanceResponse = {
  organization?: string,
  playerId?: string,
  currency?: string,
  applicableBonus?: string,
  homeCurrency?: string,
  nickName?: string,
  balance: YggdrasilMoney,
};

export type WagerRequest = {
  cat1: string,
  cat2: string,
  cat3: string,
  cat4: string,
  cat5: string,
  cat6: string,
  cat7: string,
  cat8: string,
  cat9: string,
  tag1: string,
  tag2: string,
  tag3: string,
  tag4: string,
  tag5: string,
  lang: string,
  jackpotcontribution?: YggdrasilMoney,
  prepaidref?: string,
  prepaidcost?: YggdrasilMoney,
  prepaidvalue?: YggdrasilMoney,
  prepaidticketid?: string,
  description?: string,
  reference: string,
  subreference: string,
  currency: string,
  amount: YggdrasilMoney,
} & YggdrasilRequest;
export type WagerResponse = {
  organization?: string,
  playerId?: string,
  currency?: string,
  applicableBonus?: string,
  balance?: string,
  homeCurrency?: string,
  // nickName?: api.nickName(player),
};
export type ResultRequest = {} & YggdrasilRequest;
export type ResultResponse = {};
export type PlayerinfoRequest = {} & YggdrasilRequest;
export type PlayerinfoResponse = {
  gender?: '',
  playerId?: string,
  organization?: string,
  balance?: string,
  applicableBonus?: string,
  currency?: string,
  homeCurrency?: string,
  nickName?: string,
  country?: string,
  birthdate?: string,
};
export type CancelWagerRequest = {
  reference: string,
  subreference: string,
} & YggdrasilRequest;

export type CancelWagerResponse = {
  organization?: string,
  playerId?: string,
  currency?: string,
  balance?: string,
  bonus?: string,
};

export type CampaignPayoutRequest = {
  currency: string,
  description: string,
  reference: string,
  cat1: string,
  cat2: string,
  cat3: string,
  cat4: string,
  cat5: string,
  cat6: string,
  cat7: string,
  cat8: string,
  cat9: string,
  tag1: string,
  tag2: string,
  tag3: string,
  tag4: string,
  tag5: string,
  campaignref: string,
  prepaidref: string,
  last: string,
  lang: string,
  version: string,
  bonus: YggdrasilMoney,
  cash: YggdrasilMoney,
} & YggdrasilRequest;
export type CampaignPayoutResponse = {
  organization?: string,
  playerId?: string,
  currency?: string,
  applicableBonus?: string,
  balance?: string,
  homeCurrency?: string,
};

export type AppendWagerResultRequest = {
  playerid: string,
  amount: string,
  isJackpotWin: string,
  bonusprize: string,
  currency: string,
  reference: string,
  subreference: string,
  description: string,
  cat1: string,
  cat2: string,
  cat3: string,
  cat4: string,
  cat5: string,
  tag1: string,
  tag2: string,
  tag3: string,
  lang: string,
  version: string,
} & YggdrasilRequest;
export type AppendWagerResultResponse = {
  organization?: string,
  playerId?: string,
  currency?: string,
  applicableBonus?: string,
  homeCurrency?: string,
  balance?: string,
  bonus?: string,
};

export type EndWagerRequest = {
  playerid: string,
  amount: string,
  isJackpotWin: string,
  bonusprize: string,
  currency: string,
  reference: string,
  subreference: string,
  description: string,
  cat1: string,
  cat2: string,
  cat3: string,
  cat4: string,
  cat5: string,
  tag1: string,
  tag2: string,
  tag3: string,
  lang: string,
  version: string,
  prepaidref: string,
  service: string,
  tickets: string,
} & YggdrasilRequest;
export type EndWagerResponse = {
  organization?: string,
  playerId?: string,
  currency?: string,
  applicableBonus?: string,
  balance?: string,
  homeCurrency?: string,
};

const SUCCESS = '0';
const ERROR = '1';
const NOT_LOGGED_IN = '1000';
const OVERDRAFT = '1006';
const BLOCKED = '1007';
const NOT_AUTHORIZED = '1008';

const errors = {
  SUCCESS,
  ERROR,
  NOT_LOGGED_IN,
  OVERDRAFT,
  BLOCKED,
  NOT_AUTHORIZED,
};

module.exports = {
  errors,
};
