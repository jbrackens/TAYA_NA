/* @flow */
export type LottoResponse<T> = {
    code: number,
    message: string,
    data: T,
};

export type GameTypes = {
    gametypes: {
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
    }[],
};

export type DrawingDetails = {
    drawid: number,
    gametypeid: number,
    jackpotsize: number,
    jackpotcurrency: string,
    drawdatelocal: Date,
    drawdateutc: Date,
    numbers: {
        numbers: number[],
        extranumbers: number[],
        bonusnumbers: number[],
        refundnumbers: number[],
    },
    winningscalculated: number,
    acceptingbets: number,
    jackpotBooster1: number,
    jackpotBooster2: number,
    cutoff: Date,
};

export type DrawingSchedules = {
    schedules: {
        gametypeid: number,
        dayofweek: number,
        drawingtimeutc: string,
        localtimeoffset: string,
        drawingtimelocal: string,
        drawingtimezone: string,
    }[],
};

export type PayoutTable = {
    payouttable: {
        drawid: number,
        numbers: number,
        extranumbers: number,
        bonusnumbers: number,
        refundnumbers: number,
        probability: number,
        payout: number,
        payoutcurrency: string,
        sortorder: number
    }[],
};

export type LottoNumber = 'number' | 'bonusnumber' | 'refundnumber';

export type BetRequest = {
    userid: number,
    birthdate: string,
    countrycode: string,
    ipaddress: string,
    currency: string,
    lines: {
        id: number,
        gametypeid: number,
        drawings: number,
        numbers: {
            type: LottoNumber,
            number: number
        }[],
    }[],
};

export type BetResponse = {
    statuses: {
        externalid: string,
        status: string
    }[],
};

export type TicketDetails = {
    orderstatus: string,
    createdate: Date,
    drawings: {
      drawid: number,
      gametypeid: number,
      winningscalculated: number,
      accepted: number,
      verified: number,
      drawutcdatetime: Date,
    }[],
};
