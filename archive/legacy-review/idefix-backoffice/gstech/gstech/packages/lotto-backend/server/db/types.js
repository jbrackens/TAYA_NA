/* @flow */
export type Currency = {
    currency_code: string,
    fx_rate: string,
    lastupdate: Date,
};

export type GameTypeDraft = {
    gametypeid: number,
    name: string,
    cutoffhours: number,
    currency: string,
    country: string,
    isplayable: number,
    numberscount: number,
    extranumberscount: number,
    bonusnumberscount: number,
    refundnumberscount: number,
    numbermin: number,
    numbermax: number,
    bonusnumbermin: number,
    bonusnumbermax: number,
    refundnumbermin: number,
    refundnumbermax: number,
};

export type GameTypeUpdate = {
    currentjackpot: number,
    nextdrawid: number,
} & GameTypeDraft;

export type GameType = {
    numbersperrow: number,
    bonusnumbersperrow: number,
    gameid: string,
} & GameTypeUpdate;

export type GameInfo = {
    drawdatelocal: Date,
} & GameType;

export type TicketPrice = {
    gametypeid: number,
    currencycode: string,
    priceperrow: number,
};

export type DrawingBase = {
    drawid: number,
    gametypeid: number,
    drawdateutc: Date,
    winningscalculated: number,
};

export type Drawing = {
    drawid: number,
    gametypeid: number,
    drawdateutc: Date,
    drawdatelocal: Date,
    jackpotsize: number,
    jackpotcurrency: string,
    numbers: number[],
    extranumbers: number[],
    bonusnumbers: number[],
    refundnumbers: number[],
    winningscalculated: number,
    acceptingbets: number,
    jackpotBooster1: number,
    jackpotBooster2: number,
    cutoff: Date,
};

export type DrawingSchedule = {
    gametypeid: number,
    dayofweek: number,
    drawingtimeutc: string,
    localtimeoffset: string,
    drawingtimelocal: string,
    drawingtimezone: string,
}

export type PayoutDraft = {
    drawid: number,
    numbers: number,
    extranumbers: number,
    bonusnumbers: number,
    refundnumbers: number,
    probability: number,
    payout: number,
    payoutcurrency: string,
    sortorder: number,
};

export type Payout = {
    payoutid: number,
} & PayoutDraft;

export type TicketDraft = {
    username: string,
    playerid: number,
    gametypeid: number,
    currency: string,
    drawings: number,
    purchasedate: Date,
};

export type Ticket = {
    ticketid: number,
} & TicketDraft;

export type TicketLineDraft = {
    ordernr: number,
    ticketid: number,
    price: number,
    betnumbers: number[],
    betbonusnumbers: number[],
};

export type TicketLine = {
    lineid: number,
    drawid: number,
} & TicketLineDraft;

export type TicketLineUpdate = {
    lineid: number,
    drawid: number,
}
export type Winning = {
    betid: number,
    drawid: number,
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

export type FreeLine = {
    playerid: number,
    gametypeid: number,
    freelinescount: number,
};

export type ExternalTicket = {
  playerid: number,
  username: string,
  lineid: number,
}

export type RawGameResult = GameType & Drawing & Ticket & TicketLine & Winning;
