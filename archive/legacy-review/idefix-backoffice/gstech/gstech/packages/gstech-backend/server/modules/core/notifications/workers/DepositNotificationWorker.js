/* @flow */
import type { DepositEvent } from 'gstech-core/modules/types/bus';
import type { Job } from 'gstech-core/modules/queue';

const { axios } = require('gstech-core/modules/axios');
const logger = require('gstech-core/modules/logger');
const { getPlayerWithRisk } = require('../../../players');
const Segments = require('../../../segments');
const config = require('../../../../../config');
const { getDeposit } = require('../../../payments/deposits/Deposit');
const producers = require('../../../../producer');

const handleJob = async ({ data }: Job<any>): Promise<{request: DepositEvent, response: ?any}> => {
  const player = await getPlayerWithRisk(data.playerId);
  const deposit = await getDeposit(data.transactionKey);

  if (deposit == null || deposit.status !== 'complete') {
    logger.warn('Deposit not found or not complete', data);
    return Promise.reject({ error: 'Deposit not found or not complete' });
  }
  await Segments.updatePlayerSegments(player.brandId, player.id);
  const segments = await Segments.getPlayerSegments(player.id);

  const body: DepositEvent = {
    player,
    segments,
    updateType: 'Deposit',
    deposit,
  };
  const uri = config.notifications[player.brandId];
  logger.debug('Deposit notification!', body);
  if (uri != null) {
    try {
      const producer = await producers.lazyProducingDepositEventProducer();
      await producer(body);

      const op = {
        method: 'POST',
        url: `${uri}/api/integration/deposit/${data.transactionKey}`,
        data: body,
        headers: { 'X-Token': config.api.backend.staticTokens[player.brandId] },
        timeout: 10000,
      };
      logger.debug('Sending depositNotification', op);
      const { data: response } = await axios.request(op);
      // logger.debug('Deposit complete', response);
      if (!response.ok) {
        return Promise.reject({ error: 'Deposit process failed' });
      }
      return { request: body, response };
    } catch (e) {
      if (e.cause && e.cause.code === 'ENOTFOUND') {
        logger.error('ENOTFOUND error from API. Exiting.', e);
        process.exit();
      }
      logger.error('Deposit Processing failed', { uri, e });
      throw e;
    }
  }
  logger.warn('No notification endpoint defined for brand', player.brandId);
  return { request: body, response: null };
};

module.exports = {
  handleJob,
};
