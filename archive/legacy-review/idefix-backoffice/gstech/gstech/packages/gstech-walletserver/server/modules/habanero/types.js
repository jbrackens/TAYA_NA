/* @flow */
export type HabaneroMoney = number;

export type HabaneroRequestType = 'playerdetailrequest' | 'fundtransferrequest' | 'queryrequest' | 'configdetailrequest';

export type HabaneroAuth = {
  username: string,
  passkey: string,
  machinename: string,
  locale: string,
  brandid: string,
};

export type HabaneroStatus = {
  success: boolean,
  autherror?: boolean,
  nofunds?: boolean,
  successdebit?: boolean,
  successcredit?: boolean,
  refundstatus?: number,
  message?: string,
};

export type HabaneroRequest = {
  auth: HabaneroAuth,
  type: string,
  dtsent: string,
  basegame: {
    brandgameid: string,
    keyname: string,
  },
};

export type HabaneroResponse = {
  status: HabaneroStatus,
};

export type PlayerDetailRequest = {
  playerdetailrequest: {
    token: string,
    gamelaunch: boolean,
  }
} & HabaneroRequest;

export type PlayerDetailResponse = {
  accountid: string,
  accountname: string,
  balance: HabaneroMoney,
  currencycode: string,
  newtoken?: string,
  country?: string,
  segmentkey: string,
};

export type FundInfo = {
  gamestatemode: 0 | 1 | 2 | 3,
  transferid: string,
  currencycode: string,
  amount: HabaneroMoney,
  jpwin: boolean,
  jpcont: number,
  isbonus: boolean,
  dtevent: string,
  initialdebittransferid: string,
};

export type FundTransferRequest = {
  fundtransferrequest: {
    token: string,
    accountid: string,
    customplayertype: number,
    gameinstanceid: string,
    friendlygameinstanceid: string,
    isretry: boolean,
    retrycount: number,
    isrefund: boolean,
    isrecredit: boolean,
    funds: {
      debitandcredit: boolean,
      funds?: FundInfo,
      fundinfo: FundInfo[],
    },
    gamedetails: {
      name: string,
      keyname: string,
      gametypeid: number,
      gametypename: string,
      brandgameid: string,
      gamesessionid: string,
      gameinstanceid: string,
      friendlygameinstanceid: number,
      channel: number,
      device: string,
      browser: string,
    },
  },
} & HabaneroRequest;

export type FundTransferResponse = {
  fundtransferresponse: {
    balance?: HabaneroMoney,
    currencycode?: string,
    status: HabaneroStatus,
  },
  dialogmessageresponse?: {
    message: string,
    type: number,
  },
};

export type QueryRequest = {
  queryrequest: {
    transferid: string,
    accountid: string,
    token: string,
    queryamount: HabaneroMoney,
  },
} & HabaneroRequest;
