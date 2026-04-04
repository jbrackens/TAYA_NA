/* @flow */
export type LottoWarehouseRequest<T> = {
  request_type: string,
  secret: string,
  data: T,
  requestid: number,
};

export type LottoWarehouseBaseRequest = {
  request_type: string,
  secret: string,
  data: any,
  requestid: number,
};

export type Winner = {
  betid: number,
  correctnumbers: number,
  correctextranumbers: number,
  correctbonusnumbers: number,
  correctrefundnumbers: number,
  payout: number,
  payoutcurrency: string,
  payoutusercurrency: number,
  usercurrency: string,
  drawingsremaining: number,
  externalid: string,
  externaluserid: string,
};

export type DrawingWinners = {
  batchnumber: number,
  drawid: number,
  is_last_batch: number,
  winners: Winner[],
};

export type GametypeUpdate = {
  gametypeid: number,
  name: string,
  currency: string,
  cutoffhours: number,
  isplayable: number,
  country: string,
  continent: string,
  numbers: number,
  numbermin: number,
  numbermax: number,
  extranumbers: number,
  bonusnumbers: number,
  bonusnumbermin: number,
  bonusnumbermax: number,
  refundnumbers: number,
  refundnumbermin: number,
  refundnumbermax: number,
};

export type FxUpdate = {
  currencies: {
    currency_code: string,
    fx_rate: string,
  } [],
};

export type DrawingUpdate = {
  drawid: number,
  gametypeid: number,
  drawdateutc: string,
  drawdatelocal: string,
  jackpotsize: number,
  jackpotcurrency: string,
  numbers: number[],
  extranumbers: number[],
  bonusnumbers: number[],
  refundnumbers: number[],
};

export type DrawingPayoutTable = {
  drawid: number,
  payout_table: {
    numbers: number,
    extranumbers: number,
    bonusnumbers: number,
    refundnumbers: number,
    probability: number,
    payout: number,
    payoutcurrency: string,
    sortorder: number,
    id: number,
  } [],
};
