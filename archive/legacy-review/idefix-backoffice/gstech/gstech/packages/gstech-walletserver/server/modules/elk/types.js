/* @flow */
export type GetAccountRequest = {
  PARTNERUID: string,
  PASSWORD: string,
  OPERATORID: string,
  TOKEN: string,
  CURRENCY: CurrencyId,
  EXTENSION: string,
};

export type GetAccountResponse = {
  OPERATORID: string,
  ACCOUNTID: string,
  CURRENCY: CurrencyId,
  // SESSIONID: UUID,
  JURISDICTION: string,
  // CITY: string,
  // COUNTRY: string,
  SCREENNAME: string,
};

export type GetBalanceRequest = {
  PARTNERUID: string,
  PASSWORD: string,
  OPERATORID: string,
  ACCOUNTID: string,
  SESSIONID: string,
  CURRENCY: CurrencyId,
  EXTENSION: string,
  GAMEID: string,
};

export type GetBalanceResponse = {
  OPERATORID: string,
  ACCOUNTID: string,
  CURRENCY: string,
  BALANCE: string,
};

export type GetWagerRequest = {
  PARTNERUID: string,
  PASSWORD: string,
  OPERATORID: string,
  ACCOUNTID: string,
  TXID: string,
  SESSIONID: string,
  CURRENCY: CurrencyId,
  AMOUNT: string,
  ROUNDID: string,
  GAMEID: string,
};

export type GetWagerResponse = {
  OPERATORID: string,
  ACCOUNTID: string,
  WALLETTXID: string,
  CURRENCY: string,
  BALANCE: string,
  REALMONEY: string,
  BONUSMONEY: string,
};

export type GetResultRequest = {
  PARTNERUID: string,
  PASSWORD: string,
  OPERATORID: string,
  ACCOUNTID: string,
  SESSIONID: string,
  TXID: string,
  CURRENCY: CurrencyId,
  AMOUNT: string,
  ROUNDID: string,
  GAMEID: string,
  GAMESTATUS: string,
};
export type GetResultResponse = {
  OPERATORID: string,
  ACCOUNTID: string,
  WALLETTXID: string,
  CURRENCY: string,
  BALANCE: string,
};

export type GetDepositRequest = {
  PARTNERUID: string,
  PASSWORD: string,
  OPERATORID: string,
  ACCOUNTID: string,
  SESSIONID: string,
  TXID: string,
  CURRENCY: CurrencyId,
  TYPE: string,
  EXTREF: string,
  AMOUNT: string,
};

export type GetDepositResponse = {
  OPERATORID: string,
  ACCOUNTID: string,
  WALLETTXID: string,
  CURRENCY: string,
  BALANCE: string,
};

export type GetRollbackRequest = {
  PARTNERUID: string,
  PASSWORD: string,
  OPERATORID: string,
  ACCOUNTID: string,
  SESSIONID: string,
  ROLLBACKTXID: string,
  ROUNDID: string,
  CURRENCY: CurrencyId,
  AMOUNT: string,
};

export type GetRollbackResponse = {
  OPERATORID: string,
  ACCOUNTID: string,
  WALLETTXID: string,
  CURRENCY: string,
  BALANCE: string,
};
