/* @flow */
import type { GameProvider } from 'gstech-core/modules/constants';

export type WalletType = 'vanguard' | 'local';

export type MicrogamingRequest = {
  name: 'login' | 'getbalance' | 'play' | 'awardbonus' | 'endgame' | 'refreshtoken',
  timestamp: string,
  system: string,
  seq: string,
};

export type MicrogamingAuthentication = {
  login: string,
  password: string,
};

export type TokenizedRequest = {
  token: string,
  ts: Date,
  manufacturerId: GameProvider,
}

export type ErrorResponse = {
  errorcode: number,
  errordescription: string,
}

export type LoginRequest = {
  clienttypeid?: string,
} & TokenizedRequest;

export type LoginResponse = {
  token: string,
  loginname: string,
  currency: string,
  country: string,
  city: string,
  balance: Money,
  bonusbalance: Money,
  wallet: WalletType,
  responsiblegaming?: mixed,
  regulatedmarket?: mixed,
  type?: 'Denmark' | 'Spain' | 'UK',
  extinfo?: string,
};

export type GetBalanceRequest = {
} & TokenizedRequest;

export type GetBalanceResponse = {
  token: string,
  balance: Money,
  bonusbalance: Money,
};

export type PlayType = 'bet' | 'win' | 'progressivewin' | 'refund' | 'transfertomgs' | 'transferfrommgs' | 'tournamentpurchase' | 'admin';

export type PlayRequest = {
  playtype: PlayType,
  gameid: string,
  gamereference: string,
  actionid: string,
  actiondesc: string,
  amount: Money,
  start: boolean,
  finish: boolean,
  offline?: 'true' | 'false',
  currency?: string,
  freegame?: string,
  freegameofferinstanceid?: string,
  freegamenumgamesplayed?: number,
  freegamenumgamesremaining?: number,
  clienttypeid?: string,
  extinfo?: string,
} & TokenizedRequest;

export type PlayResponse = {
  token: string,
  balance: Money,
  bonusbalance: Money,
  exttransactionid: Id | 'DEBIT-NOT-RECEIVED',
};

export type AwardBonusRequest = {
  offline: 'true' | 'false',
  type: 'cash' | 'bonus',
  amount: Money,
  transactionID: string,
  extinfo?: mixed,
} & TokenizedRequest;

export type AwardBonusResponse = {
  token: string,
  balance: Money,
  bonusbalance: Money,
  exttransactionid: Id | 'DEBIT-NOT-RECEIVED',
};

export type EndGameRequest = {
  gamereference: string,
  gameid: string,
  offline: 'true' | 'false',
} & TokenizedRequest;

export type EndGameResponse = {
  token: string,
  balance: Money,
  bonusbalance: Money,
};


export type RefreshTokenRequest = {
} & TokenizedRequest;

export type RefreshTokenResponse = {
  token: string,
};

export type MicrogamingConfiguration = { manufacturerId: GameProvider, ... }

export type MicrogamingJackpot = {
  progressiveId: number,
  moduleId: number,
  gamePayId: number,
  startAtValue: number,
  endAtValue: number,
  numberOfSeconds: number,
  centsPerSecond: number,
  currencyIsoCode: string,
  friendlyName: string,
  jackpotNumber: number,
  secondsSinceLastWin: number,
};
