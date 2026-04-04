/* @flow */
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';
import type { Deposit } from 'gstech-core/modules/types/backend';
import type { Job } from 'gstech-core/modules/queue';
import type { EEGPlayerDepositEvent } from '../eeg-types';

const logger = require('gstech-core/modules/logger');
const producers = require('../eeg-producer');
const mappers = require('../eeg-mappers');

const handleJob = async ({ data: { player, deposit } }: Job<{ player: PlayerWithDetails, deposit: Deposit }>): Promise<EEGPlayerDepositEvent> => {
  logger.debug('EEG PlayerDeposit notification', player.id, deposit.transactionKey);

  const mappedPlayer = mappers.mapEEGPlayer(player);
  const mappedDeposit = mappers.mapEEGDeposit(deposit);

  const body = {
    createdDateUtc: new Date().getTime(),
    messageType: 'PlayerDeposit',
    customerId: player.id.toString(),
    payload: { 'com.idefix.events.PlayerDeposit':  { player: mappedPlayer, deposit: mappedDeposit } },
  };

  const producer = await producers.lazyEEGEventProducer();
  await producer(body);

  logger.debug('EEG PlayerDeposit notification sent', player.id, deposit.transactionKey);

  return body;
};

module.exports = {
  handleJob,
};
