/* @flow */
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';
import type { Withdrawal } from 'gstech-core/modules/types/backend';
import type { Job } from 'gstech-core/modules/queue';
import type { EEGPlayerWithdrawalEvent } from '../eeg-types';

const logger = require('gstech-core/modules/logger');
const producers = require('../eeg-producer');
const mappers = require('../eeg-mappers');

const handleJob = async ({ data: { player, withdrawal } }: Job<{ player: PlayerWithDetails, withdrawal: Withdrawal }>): Promise<EEGPlayerWithdrawalEvent> => {
  logger.debug('EEG PlayerWithdrawal notification', player.id, withdrawal.transactionKey);

  const mappedPlayer = mappers.mapEEGPlayer(player);
  const mappedWithdrawal = mappers.mapEEGWithdrawal(withdrawal);

  const body = {
    createdDateUtc: new Date().getTime(),
    messageType: 'PlayerWithdrawal',
    customerId: player.id.toString(),
    payload: { 'com.idefix.events.PlayerWithdrawal':  { player: mappedPlayer, withdrawal: mappedWithdrawal } },
  };

  const producer = await producers.lazyEEGEventProducer();
  await producer(body);

  logger.debug('EEG PlayerWithdrawal notification sent', player.id, withdrawal.transactionKey);

  return body;
};

module.exports = {
  handleJob,
};
