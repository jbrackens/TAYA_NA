/* @flow */

export type EYERequestType = 'BALANCE_CHECK' | 'BET' | 'WIN' | 'LOSE' | 'JACKPOT_WIN' | 'RESEND' | 'ROLLBACK' | 'DOUBLE_UP' | 'FEATURE_WIN' | 'FREE_SPIN' | 'VOUCHER_CHECK' | 'VOUCHER_SUMMARY' | 'GET_TOKEN' | 'CANCEL_BET';

export type EYERequest = {
  accessid: string,
  uid: number,
  sid: string,
  gameid: string,
  guid: string,
  wager: number,
  win: number,
  ref: number,
  round: number,
  gtype: string,
  type: EYERequestType,
  cur: string,
  status: string,
  uip: IPAddress,
  udt: 'M' | 'T' | 'N', // Mobile, Tablet, Desktop/Unknown
  udp: 'I' | 'A' | 'U', // iOS, Android, Unknown
};

export type EYEBetRequest = {
  accessid: string,
  uid: string,
  gameid: string,
  guid: string,
  wager: string,
  jpcontrib: string,
  win: string,
  jpwin: string,
  ref: string,
  round: string,
  gtype: string,
  type: EYERequestType,
  cur: string,
  status: string,
};

export type EYEWinRequest = {
  accessid: string,
  uid: string,
  gameid: string,
  guid: string,
  wager: string,
  win: string,
  jpwin: string,
  ref: string,
  round: string,
  gtype: string,
  type: EYERequestType,
  cur: string,
  status: string,
};

export type EYECancelRequest = {
  cancelref: string,
  cancelwager: string,
} & EYEBetRequest;
