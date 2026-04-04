// @flow
import type {
  PlayerNotificationsWithEvents,
  CampaignContent,
  CampaignContentCreate,
} from '../../../../types/common';

const { addCampaignTimeAndStatusCheck } = require('../../../utils');

const validateIfContentIsActive = async (knex: Knex, contentId: Id) => {
  const [isContentActive] = await knex('content')
    .select('*')
    .where({ id: contentId, active: true });
  if (!isContentActive) {
    throw new Error('Content should be active.');
  }
};

const createCampaignContent = async (
  knex: Knex,
  campaignId: Id,
  campaignContent: CampaignContentCreate,
): Promise<Id> => {
  await validateIfContentIsActive(knex, campaignContent.contentId);
  const [{ id: campaignContentId }] = await knex('campaigns_content')
    .insert({
      campaignId,
      ...campaignContent,
      contentTypeId: knex('content')
        .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
        .select('content_type.id')
        .where({ 'content.id': campaignContent.contentId }),
    })
    .returning('id');

  return campaignContentId;
};

const deleteCampaignContent = async (knex: Knex, campaignContentId: Id): Promise<number> =>
  knex('campaigns_content').where({ id: campaignContentId }).update({ removedAt: new Date() });

const getCampaignContent = async (
  knex: Knex,
  campaignId: Id,
  type?: string,
): Promise<{ contentId: Id, type: string, subtype: string, sendToAll: boolean }[]> =>
  knex('campaigns_content')
    .leftJoin('content_type', 'campaigns_content.contentTypeId', 'content_type.id')
    .leftJoin('content', 'content.id', 'campaigns_content.contentId')
    .select('contentId', 'content_type.type', 'subtype', 'sendToAll')
    .where({ campaignId, removedAt: null })
    .modify((qb) => (type ? qb.where({ 'content_type.type': type }) : qb));

const getPlayerNotificationsWithEvents = (
  knex: Knex,
  externalPlayerId: Id,
): Knex$QueryBuilder<PlayerNotificationsWithEvents> =>
  knex('campaigns_content')
    .select(
      'campaigns_content.campaignId',
      'campaigns_content.contentId',
      'content.name',
      'content.externalId',
      'content.content',
      knex.raw(`coalesce(
        array_agg(json_build_object(
          'text', events.text,
          'timestamp', events.timestamp,
          'extras', events.extras
        )) filter ( where events.timestamp is not null ),
        '{}'
      ) as events`),
    )
    .leftJoin('content', 'content.id', 'campaigns_content.contentId')
    .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
    .leftJoin('campaigns', 'campaigns.id', 'campaigns_content.campaignId')
    .leftJoin('campaigns_players', 'campaigns_players.campaignId', 'campaigns.id')
    .leftJoin('players', 'players.id', 'campaigns_players.playerId')
    .leftJoin('events', {
      'events.campaignContentId': 'campaigns_content.id',
      'events.playerId': 'players.id'
    })
    .where({
      'players.externalId': externalPlayerId,
      'campaigns_players.removedAt': null,
      'campaigns_content.removedAt': null,
      'content_type.type': 'notification',
    })
    .modify((qb) => addCampaignTimeAndStatusCheck(qb, { allowPreviewMode: true }))
    .groupBy('campaigns_content.id')
    .groupBy('content.id');

const updateCampaignContent = async (
  knex: Knex,
  campaignContentId: Id,
  campaignContentCreate: CampaignContentCreate,
): Promise<CampaignContent> => {
  await validateIfContentIsActive(knex, campaignContentCreate.contentId);

  const [campaignContent] = await knex('campaigns_content')
    .where({ id: campaignContentId, removedAt: null })
    .update({
      ...campaignContentCreate,
      contentTypeId: knex('content')
        .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
        .select('content_type.id')
        .where({ 'content.id': campaignContentCreate.contentId }),
    })
    .returning('*');

  return campaignContent;
};

const upsertCampaignContent = async (
  knex: Knex,
  campaignId: Id,
  campaignContentCreate: CampaignContentCreate,
): Promise<CampaignContent> => {
  await validateIfContentIsActive(knex, campaignContentCreate.contentId);

  const insert = knex('campaigns_content').insert({
    ...campaignContentCreate,
    campaignId,
    contentTypeId: knex('content')
      .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
      .select('content_type.id')
      .where({ 'content.id': campaignContentCreate.contentId }),
  });
  return knex.raw(
    `? ON CONFLICT ("campaignId", "contentTypeId") where ("removedAt" IS NULL) DO UPDATE SET
    "contentId" = ?`,
    [insert, campaignContentCreate.contentId],
  );
};

module.exports = {
  createCampaignContent,
  deleteCampaignContent,
  getCampaignContent,
  getPlayerNotificationsWithEvents,
  updateCampaignContent,
  upsertCampaignContent,
};
