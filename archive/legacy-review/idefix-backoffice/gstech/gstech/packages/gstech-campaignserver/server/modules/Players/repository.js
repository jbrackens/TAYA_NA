/* @flow */

const moment = require('moment-timezone');

export type PlayerDraft = {
  externalId: Id,
  brandId: BrandId,
  username: string,
  email?: string,
  firstName: string,
  mobilePhone?: string,
  countryId: string,
  languageId: string,
  currencyId: string,
  allowEmailPromotions: boolean,
  allowSMSPromotions: boolean,
  subscriptionOptionsId?: Id,
  createdAt: Date | string,
  numDeposits: number,
  gamblingProblem: boolean,
  potentialGamblingProblem?: boolean,
  invalidMobilePhone?: boolean,
  invalidEmail?: boolean,
  tags: string[],
  segments: string[],
  testPlayer?: boolean,
  subscriptionToken?: string,
  lastSeen?: Date | string,
  registrationLandingPage?: ?string,
};

export type Player = { id: Id, ...PlayerDraft };

export type PlayerUpdate = Partial<PlayerDraft>;

export type SubscriptionOptionType = 'all' | 'new_games' | 'best_offers';
export type SubscriptionOptions = {
  id: Id,
  emails: SubscriptionOptionType,
  smses: SubscriptionOptionType,
  snoozeEmailsUntil: Date,
  snoozeSmsesUntil: Date,
};

export type PlayerWithSubscriptionOptions = {
  id: Id,
  subscriptionOptions: SubscriptionOptions,
  ...PlayerDraft,
};

const { hstoreFromArray } = require('gstech-core/modules/utils');

const { addCampaignTimeAndStatusCheck } = require('../../utils');

// For dynamic campaigns connect only consent campaigns
// For static campaigns connect all campaigns
const connectDepositWithPlayerActiveCampaigns = (
  knex: Knex,
  depositId: Id,
  externalPlayerId: Id,
  consentCampaigns: Id[],
): Knex$QueryBuilder<any> =>
  // Insert into campaigns_deposits ("depositId", "campaignId", "playerConsent") ...
  knex
    .from(
      knex.raw('?? (??, ??, ??)', [
        'campaigns_deposits',
        'depositId',
        'campaignId',
        'playerConsent',
      ]),
    )
    .insert(
      knex('campaigns_players')
        .select(
          knex.raw('? as ??', [depositId, 'depositId']),
          'campaigns.id as campaignId',
          knex.raw('campaigns.id = ANY(?) as ??', [consentCampaigns, 'playerConsent']),
        )
        .innerJoin('campaigns', 'campaigns.id', 'campaigns_players.campaignId')
        .innerJoin('players', 'players.id', 'campaigns_players.playerId')
        .where({ 'players.externalId': externalPlayerId })
        .andWhere((qb) =>
          qb
            .where({ audienceType: 'static' })
            .orWhere((qb) =>
              qb
                .where({ audienceType: 'dynamic' })
                .whereRaw('campaigns.id = ANY(?)', [consentCampaigns]),
            ),
        )
        .modify(addCampaignTimeAndStatusCheck),
    );

const createOrUpdatePlayerSubscriptionOptions = async (
  knex: Knex,
  player: Player,
  subscriptionOptionsDraft: { emails?: SubscriptionOptionType, smses?: SubscriptionOptionType },
): Promise<SubscriptionOptions> => {
  if (player.subscriptionOptionsId) {
    const [so] = await knex('subscription_options')
      .where({ id: player.subscriptionOptionsId })
      .update(subscriptionOptionsDraft, ['*']);
    return so;
  }

  const [so] = await knex('subscription_options').insert(subscriptionOptionsDraft).returning('*');
  // eslint-disable-next-line no-use-before-define
  await updatePlayer(knex, player.id, { subscriptionOptionsId: so.id });
  return so;
};

const getPlayer = async (
  knex: Knex,
  {
    email,
    externalId,
    id,
    subscriptionToken,
  }: { email?: string, externalId?: Id, id?: Id, subscriptionToken?: string },
): Promise<?Player> => {
  if (!id && !externalId && !email && !subscriptionToken) return null;
  return knex('players')
    .first()
    .modify((qb) => {
      if (email) qb.whereRaw('lower("email")=?', [email.toLowerCase()]);
      if (externalId) qb.where({ externalId });
      if (id) qb.where({ id });
      if (subscriptionToken) qb.where({ subscriptionToken });
    });
};

const getPlayerSubscriptionToken = async (
  knex: Knex,
  { id, email, brandId }: { id?: Id, email?: string, brandId?: BrandId },
): Promise<string> => {
  if (!id && !(email && brandId)) throw new Error('Missing parameters');
  const [token] = await knex('players')
    .pluck('subscriptionToken')
    .modify((qb) => {
      if (id) qb.where({ id });
      if (email && brandId)
        qb.where({ brandId }).whereRaw('lower("email")=?', [email.toLowerCase()]);
    });
  return token;
};

const snoozePlayerSubscription = async (
  knex: Knex,
  subscriptionOptionsId: Id,
  type: 'email' | 'sms',
  revertSnooze: boolean = false,
): Promise<any> => {
  let updateObj;
  if (revertSnooze) {
    updateObj = type === 'email' ? { snoozeEmailsUntil: null } : { snoozeSmsesUntil: null };
  } else {
    const date = moment().add(30, 'days');
    updateObj = type === 'email' ? { snoozeEmailsUntil: date } : { snoozeSmsesUntil: date };
  }
  const [so] = await knex('subscription_options')
    .where({ id: subscriptionOptionsId })
    .update(updateObj, ['*']);
  return so;
};

const updatePlayer = async (
  knex: Knex,
  playerId: Id,
  playerUpdate: PlayerUpdate,
): Promise<Player> => {
  const [player] = await knex('players').update(playerUpdate, ['*']).where({ id: playerId });
  return player;
};

/**
 * @param tx ensure the passed object is a transaction
 * @param playerDraft new or existing player object to upsert
 */
const upsertPlayer = async (tx: Knex, playerDraft: PlayerDraft): Promise<Player> => {
  const player: Player = await tx('players')
    .where({ externalId: playerDraft.externalId })
    .first()
    .forUpdate();

  const insertObj = {
    ...playerDraft,
    countryId: tx('countries').select('id').where({
      code: playerDraft.countryId,
      brandId: playerDraft.brandId,
    }),
    tags: hstoreFromArray(playerDraft.tags),
    segments: hstoreFromArray(playerDraft.segments),
  };

  // Create subscription options for player if not available
  if (!player || (player && !player.subscriptionOptionsId)) {
    const [{ id: subscriptionOptionsId }] = await tx('subscription_options')
      .insert({
        emails: insertObj.allowEmailPromotions ? 'all' : 'none',
        smses: insertObj.allowSMSPromotions ? 'all' : 'none',
      })
      .returning('id');
    insertObj.subscriptionOptionsId = subscriptionOptionsId;
  } else {
    const subscriptionOptions = await tx('subscription_options')
      .where({ id: player.subscriptionOptionsId })
      .first();

    // Update subscriptionOptions based on allowXPromotions
    if (player.allowEmailPromotions && !insertObj.allowEmailPromotions)
      subscriptionOptions.emails = 'none';
    else if (!player.allowEmailPromotions && insertObj.allowEmailPromotions)
      subscriptionOptions.emails =
        subscriptionOptions.emails !== 'none' ? subscriptionOptions.emails : 'all';
    if (player.allowSMSPromotions && !insertObj.allowSMSPromotions)
      subscriptionOptions.smses = 'none';
    else if (!player.allowSMSPromotions && insertObj.allowSMSPromotions)
      subscriptionOptions.smses =
        subscriptionOptions.smses !== 'none' ? subscriptionOptions.smses : 'all';
    await tx('subscription_options')
      .update(subscriptionOptions)
      .where({ id: player.subscriptionOptionsId });
  }

  let newPlayer;
  if (player) {
    if (player.mobilePhone !== playerDraft.mobilePhone) insertObj.invalidMobilePhone = false;
    if (player.email !== playerDraft.email) insertObj.invalidEmail = false;
    if (player.numDeposits > playerDraft.numDeposits) insertObj.numDeposits = player.numDeposits;
    [newPlayer] = await tx('players').update(insertObj, ['*']).where({ id: player.id });
  } else [newPlayer] = await tx('players').insert(insertObj, ['*']);
  return newPlayer;
};

module.exports = {
  connectDepositWithPlayerActiveCampaigns,
  createOrUpdatePlayerSubscriptionOptions,
  getPlayer,
  getPlayerSubscriptionToken,
  snoozePlayerSubscription,
  updatePlayer,
  upsertPlayer,
};
