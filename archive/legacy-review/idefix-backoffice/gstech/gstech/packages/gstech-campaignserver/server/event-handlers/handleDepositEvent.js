// @flow
import type { DepositEvent } from 'gstech-core/modules/types/bus';
import type { DepositDraft } from '../../types/common';

const logger = require('gstech-core/modules/logger');
const { Money } = require('gstech-core/modules/money-class');

const { createDeposit, getDepositByPaymentId, upsertDeposit } = require('../repository');
const {
  connectDepositWithPlayerActiveCampaigns,
  updatePlayer,
} = require('../modules/Players/repository');
const { updatePlayersCampaignsMembership } = require('../modules/Campaigns/repository');
const { creditRewardsIfFeasible } = require('./rewardHandlers');
const { handlePlayerUpdateEvent } = require('./handleUpdateEvent');

const handleDepositEvent = async (knex: Knex, event: DepositEvent): Promise<Id | null> => {
  const { deposit, segments, player, updateType } = event;
  if (updateType === 'Deposit') { // This is for skipping old events with incomplete data
    await handlePlayerUpdateEvent(knex, { player, segments, updateType });
    logger.debug('handleDepositEvent', deposit.paymentId);
  }
  const perPlayerCount = deposit.index + 1;
  const convertedAmount = new Money(deposit.amount, player.currencyId).asBaseCurrency().asFixed();

  const depositDraft: DepositDraft = {
    externalPlayerId: deposit.playerId,
    paymentId: deposit.paymentId,
    timestamp: deposit.timestamp,
    amount: deposit.amount,
    convertedAmount,
    perPlayerCount,
  };

  return knex.transaction(async (tx) => {
    const dbPlayer = await tx('players')
      .where({ externalId: deposit.playerId })
      .first()
      .forUpdate();

    if (!dbPlayer) {
      return Promise.reject(`Player ${deposit.playerId} does not exist`);
    }

    const dbDeposit = await getDepositByPaymentId(tx, deposit.paymentId).forUpdate();
    if (dbDeposit) {
      await upsertDeposit(tx, depositDraft);
      return dbDeposit.id;
    }

    const depositId = await createDeposit(tx, depositDraft);

    // Update player numDeposits and evaluate membership
    await updatePlayer(tx, dbPlayer.id, {
      numDeposits: Math.max(dbPlayer.numDeposits, perPlayerCount),
    });
    await updatePlayersCampaignsMembership(tx, dbPlayer.id, dbPlayer.brandId);

    const parameters = (deposit.parameters: any) || {};
    const campaignIds = (parameters.campaignIds || []).filter(campaignId => !Number.isNaN(Number(campaignId)));
    await connectDepositWithPlayerActiveCampaigns(
      tx,
      depositId,
      deposit.playerId,
      campaignIds,
    );

    await creditRewardsIfFeasible(tx, {
      externalPlayerId: deposit.playerId,
      eventType: 'deposit',
      brandId: player.brandId,
      username: player.username,
      eventId: deposit.transactionKey,
      amount: convertedAmount,
      transactionKey: deposit.transactionKey,
      currencyId: player.currencyId,
      campaignIds,
      timestamp: deposit.timestamp,
    });

    await updatePlayersCampaignsMembership(tx, dbPlayer.id, dbPlayer.brandId);
    return depositId;
  });
};

module.exports = {
  handleDepositEvent,
};
