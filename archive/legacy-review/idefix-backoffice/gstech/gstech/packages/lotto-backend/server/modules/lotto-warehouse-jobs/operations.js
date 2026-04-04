/* @flow */
import type { Payout, GameType, DrawingSchedule, Drawing, DrawingBase } from '../../db/types';
import type { TicketDetails } from '../../lotto-warehouse-client/types';

const logger = require('gstech-core/modules/logger');
const client = require('../../lotto-warehouse-client');
const db = require('../../db');

const updateGames = async (): Promise<Array<GameType>> => {
  const gameTypes = await client.getGametypes();
  return Promise.all(gameTypes.gametypes.map((gameType) => db.upsertGameType(gameType)));
};

const updateSchedules = async (): Promise<Array<DrawingSchedule>> => {
  const drawingSchedules = await client.getDrawingSchedules();
  return Promise.all(
    drawingSchedules.schedules.map((schedule) => db.upsertDrawingSchedule(schedule)),
  );
};

const updateDrawing = async (drawId: number): Promise<Drawing> => {
  const drawDetails = await client.getDrawingDetails(drawId);
  const drawing: Drawing = {
    drawid: drawDetails.drawid,
    gametypeid: drawDetails.gametypeid,
    jackpotsize: drawDetails.jackpotsize,
    jackpotcurrency: drawDetails.jackpotcurrency,
    drawdatelocal: drawDetails.drawdatelocal,
    drawdateutc: drawDetails.drawdateutc,
    ...drawDetails.numbers,
    winningscalculated: drawDetails.winningscalculated,
    acceptingbets: drawDetails.acceptingbets,
    jackpotBooster1: drawDetails.jackpotBooster1,
    jackpotBooster2: drawDetails.jackpotBooster2,
    cutoff: drawDetails.cutoff,
  };

  return db.upsertDrawing(drawing);
};

const updatePayoutTable = async (drawid: number): Promise<Payout[] | string>=> {
  try {
    const payoutTable = await client.getPayoutTable(drawid);
    await db.deletePayout(drawid);
    return Promise.all(payoutTable.payouttable.map(payout => db.insertPayout(payout)));
  } catch (e) {
    logger.debug('update payout table failed:', e);
    return Promise.resolve(`payout table for drawing '${drawid}' is not yet published`);
  }
};

const updateTickets = async (lineid: number, externalid: string): Promise<void[]> => {
  const ticketDetails: TicketDetails = await client.getTicketDetails(externalid);

  return Promise.all(ticketDetails.drawings.map(async (drawing) => {
    const drawingBase: DrawingBase = {
      drawid: drawing.drawid,
      gametypeid: drawing.gametypeid,
      drawdateutc: drawing.drawutcdatetime,
      winningscalculated: drawing.winningscalculated,
    };

    await db.upsertDrawingBase(drawingBase);
    return db.updateTicketLine({ lineid, drawid: drawing.drawid });
  }));
};

module.exports = {
  updateGames,
  updateSchedules,
  updateDrawing,
  updatePayoutTable,
  updateTickets,
};
