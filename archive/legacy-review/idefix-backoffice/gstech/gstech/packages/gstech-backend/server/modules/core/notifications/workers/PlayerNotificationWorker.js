/* @flow */
import type { PlayerUpdateEvent } from 'gstech-core/modules/types/bus';
import type { Job } from 'gstech-core/modules/queue';

const { axios } = require('gstech-core/modules/axios');
const logger = require('gstech-core/modules/logger');
const Player = require('../../../players');
const config = require('../../../../../config');
const Segments = require('../../../segments');
const producers = require('../../../../producer');

const handleJob = async ({
  data,
}: Job<any>): Promise<?{ request: PlayerUpdateEvent, response: ?any }> => {
  try {
    logger.debug('PlayerNotificationWorker::handleJob()', { data });
    const player = await Player.getPlayerWithRisk(data.playerId);
    await Segments.updatePlayerSegments(player.brandId, player.id);
    const segments = await Segments.getPlayerSegments(player.id);
    const body: PlayerUpdateEvent = { player, segments, updateType: data.updateType };

    const producer = await producers.lazyProducingPlayerUpdateEventProducer();
    await producer(body);

    const uri = config.notifications[player.brandId];
    if (uri != null) {
      const op = {
        method: 'POST',
        url: `${uri}/api/integration/players`,
        data: body,
        headers: { 'X-Token': config.api.backend.staticTokens[player.brandId] },
        timeout: 10000,
      };
      logger.debug('>>> PlayerNotificationWorker::handleJob()', { request: op });
      const { data: response } = await axios.request(op);
      logger.debug('<<< PlayerNotificationWorker::handleJob()', { response });
      return { request: body, response };
    }
    logger.warn('!!! PlayerNotificationWorker::handleJob()', `No '${player.brandId}' Endpoint`, {
      brandId: player.brandId,
      body,
    });
    return { request: body, response: null };
  } catch (e) {
    logger.error('XXX PlayerNotificationWorker::handleJob()', `${data.playerId}`, {
      playerId: data.playerId,
      error: e,
    });
    return null;
  }
};

module.exports = {
  handleJob,
};
