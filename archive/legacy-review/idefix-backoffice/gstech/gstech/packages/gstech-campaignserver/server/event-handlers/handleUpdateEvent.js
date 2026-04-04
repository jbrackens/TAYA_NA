/* @flow */
import type { PlayerUpdateType, PlayerUpdateEvent } from 'gstech-core/modules/types/bus';
import type { Player, PlayerDraft } from '../modules/Players/repository';
import type { RewardRulesTrigger } from '../../types/common';

const logger = require('gstech-core/modules/logger');

const { createEvent } = require('../modules/Events/repository');
const { upsertPlayer } = require('../modules/Players/repository');
const { updatePlayersCampaignsMembership } = require('../modules/Campaigns/repository');
const { creditRewardsIfFeasible } = require('./rewardHandlers');

const mapEventType = (event: PlayerUpdateType): ?RewardRulesTrigger => ({
  Deposit: 'deposit',
  Login: 'login',
  Registration: 'registration',
  Default: null,
}[event]);

const handlePlayerUpdateEvent = async (knex: Knex, event: PlayerUpdateEvent): Promise<Player> => {
  const { player, segments, updateType } = event;
  const isLoginOrRegistration = updateType === 'Login' || updateType === 'Registration';
  logger.info(`handlePlayerUpdateEvent ${player.id}`, { player });
  const playerDraft: PlayerDraft = {
    externalId: player.id,
    brandId: player.brandId,
    username: player.username,
    email: player.email,
    firstName: player.firstName,
    mobilePhone: player.mobilePhone,
    countryId: player.countryId,
    languageId: player.languageId,
    currencyId: player.currencyId,
    allowEmailPromotions: player.allowEmailPromotions,
    allowSMSPromotions: player.allowSMSPromotions,
    createdAt: player.createdAt,
    numDeposits: player.numDeposits,
    gamblingProblem: player.gamblingProblem,
    potentialGamblingProblem: player.potentialGamblingProblem,
    tags: player.tags,
    registrationLandingPage: player.registrationSource,
    segments,
  };
  logger.info(`handlePlayerUpdateEvent playerDraft`, { playerDraft });
  if (isLoginOrRegistration) playerDraft.lastSeen = new Date();

  return await knex.transaction(async (tx) => {
    const updatedPlayer = await upsertPlayer(tx, playerDraft);
    logger.info(`handlePlayerUpdateEvent->updatedPlayer`, { updatedPlayer });
    const playerCampaigns = await updatePlayersCampaignsMembership(tx, updatedPlayer?.id, updatedPlayer?.brandId);

    const eventType = mapEventType(updateType);
    if (isLoginOrRegistration && eventType) {
      const ts = new Date();
      await creditRewardsIfFeasible(tx, {
        eventType,
        externalPlayerId: player.id,
        brandId: player.brandId,
        username: player.username,
        eventId: `${player.username}-${ts.getTime()}`,
        timestamp: ts,
      });

      await playerCampaigns
        .filter((pc) => ['added', 'intact'].includes(pc.status))
        .map(
          async ({ campaignId }) =>
            await createEvent(tx, {
              text: mapEventType(updateType) || '',
              externalPlayerId: player.id,
              campaignId,
            }),
        );
    }
    return updatedPlayer;
  });
};

module.exports = {
  handlePlayerUpdateEvent,
};
