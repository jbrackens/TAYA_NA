/* @flow */
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';
import type { Job } from 'gstech-core/modules/queue';
import type { EEGPlayerUpdateEvent } from '../eeg-types';

const logger = require('gstech-core/modules/logger');
const producers = require('../eeg-producer');
const mappers = require('../eeg-mappers');

const handleJob = async ({ data: { player } }: Job<{ player: PlayerWithDetails }>): Promise<EEGPlayerUpdateEvent> => {
  logger.debug('EEG PlayerUpdate notification', player.id);

  const mappedPlayer = mappers.mapEEGPlayer(player);

  const body = {
    createdDateUtc: new Date().getTime(),
    messageType: 'PlayerUpdate',
    customerId: player.id.toString(),
    payload: { 'com.idefix.events.PlayerUpdate':  { player: mappedPlayer } },
  };

  const producer = await producers.lazyEEGEventProducer();
  await producer(body);

  logger.debug('EEG PlayerUpdate notification sent', player.id);

  return body;
};

module.exports = {
  handleJob,
};
