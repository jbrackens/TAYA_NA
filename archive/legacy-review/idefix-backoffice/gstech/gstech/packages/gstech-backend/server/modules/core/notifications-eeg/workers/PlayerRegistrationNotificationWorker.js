/* @flow */
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';
import type { Job } from 'gstech-core/modules/queue';
import type { EEGPlayerRegistrationEvent } from '../eeg-types';

const logger = require('gstech-core/modules/logger');
const producers = require('../eeg-producer');
const mappers = require('../eeg-mappers');

const handleJob = async ({ data: { player } }: Job<{ player: PlayerWithDetails }>): Promise<EEGPlayerRegistrationEvent> => {
  logger.debug('EEG PlayerRegistration notification', player.id);

  const mappedPlayer = mappers.mapEEGPlayer(player);

  const body = {
    createdDateUtc: new Date().getTime(),
    messageType: 'PlayerRegistration',
    customerId: player.id.toString(),
    payload: { 'com.idefix.events.PlayerRegistration':  { player: mappedPlayer } },
  };

  const producer = await producers.lazyEEGEventProducer();
  await producer(body);

  logger.debug('EEG PlayerRegistration notification sent', player.id);

  return body;
};

module.exports = {
  handleJob,
};
