/* @flow */
const logger = require('gstech-core/modules/logger');
const db = require('../../db');
const operations = require('./operations');

const updateGamesJob = async () => {
  logger.debug('updateGamesJob: starting...');

  const gametypes = await operations.updateGames();
  logger.debug(`updateGamesJob: found '${gametypes.length}' game types`);

  await Promise.all(gametypes.map((gameType) => {
    logger.debug(`updateGamesJob: updating drawing '${gameType.nextdrawid}'`);
    return operations.updateDrawing(gameType.nextdrawid);
  }));

  logger.debug('updateGamesJob: completed successfully');
};

const updateDrawingsJob = async () => {
  logger.debug('updateDrawingsJob: starting...');

  const drawings = await db.getCurrentDrawings();
  logger.debug(`updateDrawingsJob: found '${drawings.length}' active drawings`);

  await Promise.all(drawings.map((drawing) => {
    logger.debug(`updateDrawingsJob: updating drawing '${drawing.drawid}'`);
    return operations.updateDrawing(drawing.drawid);
  }));

  logger.debug('updateDrawingsJob: completed successfully');
};

const updatePayoutsJob = async () => {
  logger.debug('updatePayoutsJob: starting...');

  const drawings = await db.getDrawingsWithoutPayout();
  logger.debug(`updatePayoutsJob: found '${drawings.length}' drawings without payout table`);

  await Promise.all(drawings.map((drawing) => {
    logger.debug(`updatePayoutsJob: updating payout table for drawing '${drawing.drawid}'`);
    return operations.updatePayoutTable(drawing.drawid);
  }));

  logger.debug('updatePayoutsJob: completed successfully');
};

const updateSchedulesJob = async () => {
  logger.debug('updateScheduleJob: starting...');

  await operations.updateSchedules();

  logger.debug('updateScheduleJob: completed successfully');
};

const updateTicketsJob = async () => {
  logger.debug('updateTicketsJob: starting...');

  const ticketLines = await db.getTicketLinesWithoutDrawing();

  await Promise.all(ticketLines.map((line) => {
    logger.debug(`updateTicketsJob: updating ticket ${line.lineid} for player '${line.playerid}'`);
    return operations.updateTickets(line.lineid, `${line.playerid}${line.lineid}`);
  }));

  logger.debug('updateTicketsJob: completed successfully');
};

module.exports = {
  updateGamesJob,
  updateDrawingsJob,
  updatePayoutsJob,
  updateSchedulesJob,
  updateTicketsJob,
};
