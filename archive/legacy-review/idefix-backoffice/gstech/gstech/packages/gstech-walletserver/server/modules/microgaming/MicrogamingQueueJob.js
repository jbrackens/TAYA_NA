/* @flow */
const { v1: uuid } = require('uuid');
const moment = require('moment-timezone');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const logger = require('gstech-core/modules/logger');
const orion = require('./MicrogamingAPI');
const { getConf } = require('./MicrogamingGame');

const processRollbackQueue = async (bid: BrandId) => {
  const rollbackQueue = await orion.getRollbackQueueData(bid);
  const conf = getConf();
  for (const item of rollbackQueue) {
    const [brandId, playerId] = item.LoginName[0].split('_');
    const r = {
      brandId,
      manufacturer: conf.manufacturerId,
      transactionId: item.MgsReferenceNumber[0],
      timestamp: moment(item.DateCreated[0], 'MM/DD/YYYY hh:mm:ss A').toDate(),
    };
    logger.info('process RollbackQueue', item, playerId, r);
    const { transactionIds } = await api.cancelTransaction(playerId, r);
    await orion.manuallyValidateBet(bid, 'RollbackQueue', item.UserId[0], item.RowIdLong[0], String(transactionIds.length > 0 ? transactionIds[0] : item.MgsReferenceNumber[0]));
  }
};

const processCommitQueue = async (bid: BrandId) => {
  const commitQueue = await orion.getCommitQueueData(bid);
  const conf = getConf();
  for (const item of commitQueue) {
    const [brandId, playerId] = item.LoginName[0].split('_');
    const r = {
      brandId,
      manufacturer: conf.manufacturerId,
      closeRound: true,
      game: item.GameName[0],
      useGameId: true,
      sessionId: undefined,
      gameRoundId: uuid(),
      transactionId: item.MgsReferenceNumber[0],
      wins: [{ type: item.ProgressiveWin[0] === 'true' ? 'jackpot' : 'win', amount: Number(item.PayoutAmount[0]) }],
      timestamp: moment(item.DateCreated[0], 'MM/DD/YYYY hh:mm:ss A').toDate(),
    };
    logger.info('process CommitQueue', item, playerId, r);
    const { transactionId } = await api.win(playerId, r);
    await orion.manuallyValidateBet(bid, 'CommitQueue', item.UserId[0], item.RowIdLong[0], String(transactionId));
  }
};

const processFailedEndGameQueue = async (brandId: BrandId) => {
  logger.info('>>> MicroGaming PROCESSFAILEDENDGAME', { brandId });
  const failedGameQueue = await orion.getFailedEndGameQueue(brandId);
  logger.info('<<< MicroGaming PROCESSFAILEDENDGAME', { failedGameQueue });
};

module.exports = {
  processCommitQueue,
  processRollbackQueue,
  processFailedEndGameQueue,
};
