/* @flow */
import type { GameTypeDraft, Winning, GameType } from "../../db/types";
import type { DrawingWinners, GametypeUpdate, FxUpdate, DrawingUpdate, DrawingPayoutTable } from './types';

const client = require('gstech-core/modules/clients/backend-wallet-api');
const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');

const db = require('../../db');

const drawingwinners = async (drawingWinners: DrawingWinners) => {
  await Promise.all(drawingWinners.winners.map(async (winner) => {
    try {
      const ticketDetail: Winning = {
        drawid: drawingWinners.drawid,
        ...winner,
      };
      ticketDetail.payout = money.parseMoney(ticketDetail.payout);
      ticketDetail.payoutusercurrency = money.parseMoney(ticketDetail.payoutusercurrency);
      await db.upsertWinning(ticketDetail);

      const drawing = await db.getDrawing(drawingWinners.drawid);

      if (!drawing) {
        throw Error(`Drawing '${drawingWinners.drawid}' not found in the database`);
      }

      const lineid = winner.externalid.replace(winner.externaluserid, '');
      const line = await db.getTicketLine(Number(lineid));
      const game = await db.getGameType(drawing.gametypeid);
      const player = await client.getPlayer(Number(winner.externaluserid));

      const winRequest = {
        brandId: player.brandId,
        wins: [{
          amount: money.parseMoney(winner.payoutusercurrency),
          type: line && line.price === 0 ? 'freespins' : 'win',
        }],
        manufacturer: 'LW',
        game: String(game.gameid),
        createGameRound: false,
        closeRound: true,
        gameRoundId: winner.externalid,
        transactionId: `${winner.externalid}-win`,
        timestamp: new Date(),
        sessionId: undefined,
      };

      await client.win(Number(winner.externaluserid), winRequest);
    } catch (e) {
      logger.error('posting a win failed', e, winner);
    }
  }));
};

const gametypeupdate = async (gameTypeUpdate: GametypeUpdate): Promise<GameType> => {
  const gameTypeDraft: GameTypeDraft = {
    gametypeid: gameTypeUpdate.gametypeid,
    name: gameTypeUpdate.name,
    cutoffhours: gameTypeUpdate.cutoffhours,
    currency: gameTypeUpdate.currency,
    country: gameTypeUpdate.country,
    isplayable: gameTypeUpdate.isplayable,
    numberscount: gameTypeUpdate.numbers,
    extranumberscount: gameTypeUpdate.extranumbers,
    bonusnumberscount: gameTypeUpdate.bonusnumbers,
    refundnumberscount: gameTypeUpdate.refundnumbers,
    numbermin: gameTypeUpdate.numbermin,
    numbermax: gameTypeUpdate.numbermax,
    bonusnumbermin: gameTypeUpdate.bonusnumbermin,
    bonusnumbermax: gameTypeUpdate.bonusnumbermax,
    refundnumbermin: gameTypeUpdate.refundnumbermin,
    refundnumbermax: gameTypeUpdate.refundnumbermax,
  };

  return db.upsertGameTypeUdpate(gameTypeDraft);
};

const fxupdate = async (fxUpdate: FxUpdate) => {
  await Promise.all(fxUpdate.currencies.map((fxitem) => {
    const currency = {
      ...fxitem,
      lastupdate: new Date(),
    };

    return db.upsertCurrency(currency);
  }));
};

const drawingupdate = async (drawingUpdate: DrawingUpdate) => {
  await db.upsertDrawingUpdate(drawingUpdate);
};

const drawingpayouttable = async (drawingPayoutTable: DrawingPayoutTable) => {
  await db.deletePayout(drawingPayoutTable.drawid);
  await Promise.all(drawingPayoutTable.payout_table.map((payout) => {
    const payoutRow = {
      drawid: drawingPayoutTable.drawid,
      ...payout,
    };
    return db.insertPayout(payoutRow);
  }));
};

module.exports = {
  drawingwinners,
  gametypeupdate,
  fxupdate,
  drawingupdate,
  drawingpayouttable,
};
