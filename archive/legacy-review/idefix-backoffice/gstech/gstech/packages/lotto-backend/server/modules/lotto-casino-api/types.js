/* @flow */

export type Game = {
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
    currentjackpot: number,
    nextdrawid: number,
    drawdatelocal: Date,
    numbersperrow: number,
    bonusnumbersperrow: number,
    priceperrow: number,
    symbol: string,
    locale: string,
    gameid: string,
};

export type Balances = {
  balance: number,
  currency: string,
  freelines: number,
};

export type TicketRequest = {
    gameid: string,
    drawings: number,
    details: {
        betnumbers: number[],
        betbonusnumbers: number[],
    }[],
};

export type GameResult = {
    gameName: string,
    gameDate: Date,
    price: number,
    currency: string,
    totalwin: number,
    winningnumbers: number[],
    winningbonusnumbers: number[],
    currentjackpot: number,
    details: {
        numbers: number[],
        bonusnumbers: number[],
        win: string,
    }[],
};
