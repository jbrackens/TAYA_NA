// @flow
import type { Content, ContentDraft } from 'gstech-core/modules/types/campaigns';

import type { GetPlayerAvailableContentResponse } from '../../../types/api';
import type {
  ContentUpdate,
  ContentWithLocation,
  ContentCreationDraft,
  ContentWithEvents,
} from '../../../types/common';

const { upsert2 } = require('gstech-core/modules/knex');

const { addCampaignTimeAndStatusCheck } = require('../../utils');
const config = require('../../config');

const createContent = async (
  knex: Knex,
  { brandId, location, type, content, externalId, ...contentDraft }: ContentCreationDraft,
): Promise<Content> => {
  const contentType = await knex('content_type')
    .where({ brandId, type })
    .modify((qb) => (location ? qb.where({ location }) : qb))
    .first();

  if (!contentType) {
    return Promise.reject({
      httpCode: 404,
      message: `Cannot find content type for brandId: ${brandId}, type: ${type}`,
    });
  }

  const [newContent] = await knex('content')
    .insert({
      content: JSON.stringify(content),
      contentTypeId: contentType.id,
      status: 'draft',
      externalId: externalId || contentDraft.name,
      ...contentDraft,
    })
    .returning('*');
  return newContent;
};

const deleteContent = async (knex: Knex, contentId: Id): Promise<boolean> => {
  const numDeleted = await knex('content').where({ id: contentId }).del();

  return numDeleted === 1;
};

const getContentById = async (knex: Knex, contentId: Id): Promise<Content> =>
  knex('content').where({ id: contentId }).first();

const getContentByName = async (knex: Knex, brandId: BrandId, name: string): Promise<Content> =>
  knex('content')
    .first('content.*')
    .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
    .where({ brandId, name });

const getContentList = async (
  knex: Knex,
  {
    brandId,
    contentType,
    status,
    location,
    excludeInactive,
  }: {
    brandId?: BrandId,
    contentType?: string,
    status?: string,
    location?: string,
    excludeInactive?: boolean,
  },
): Promise<ContentWithLocation[]> =>
  knex('content')
    .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
    .select('content.*', 'content_type.location')
    .modify((qb) => (brandId ? qb.where({ brandId }) : qb))
    .modify((qb) => (contentType ? qb.where({ type: contentType }) : qb))
    .modify((qb) => (status ? qb.where({ status }) : qb))
    .modify((qb) => (location ? qb.where({ location }) : qb))
    .modify((qb) => (excludeInactive ? qb.where({ active: true }) : qb))
    .orderBy('active', 'desc')
    .orderBy('externalId');

const getLocalizations = async (
  knex: Knex,
  {
    brandId,
    status,
    excludeInactive,
  }: { brandId?: BrandId, status?: string, excludeInactive?: boolean },
): Promise<Content[]> =>
  knex('content')
    .select('content.*')
    .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
    .where({ type: 'localization', brandId: 'LD' })
    .modify((qb) => (brandId ? qb.whereRaw(`content -> 'brands' ? array[?]`, [knex.raw('\\?|'), brandId]) : qb))
    .modify((qb) => (status ? qb.where({ status }) : qb))
    .modify((qb) => (excludeInactive ? qb.where({ active: true }) : qb));

const getContentWithInfo = async (
  knex: Knex,
  contentId: Id,
): Promise<{ content: any, brandId: BrandId, type: string }> =>
  knex('content')
    .select('content', 'brandId', 'type')
    .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
    .where({ 'content.id': contentId })
    .first();

const getPlayerAvailableContent = async (
  knex: Knex,
  externalPlayerId: Id,
  contentType: string,
): Promise<GetPlayerAvailableContentResponse> =>
  knex('content')
    .select(
      'content.id',
      'content.name',
      knex.raw('content.content -> lower(players."languageId") as content'),
      knex.raw(
        "array_agg(json_build_object('timestamp', events.timestamp, 'text', events.text)) events",
      ),
    )
    .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
    .leftJoin('campaigns_content', 'campaigns_content.contentId', 'content.id')
    .leftJoin('campaigns', 'campaigns.id', 'campaigns_content.campaignId')
    .leftJoin('campaigns_players', 'campaigns_players.campaignId', 'campaigns.id')
    .leftJoin('players', 'players.id', 'campaigns_players.playerId')
    .leftJoin('events', 'events.campaignContentId', 'campaigns_content.id')
    .where({
      'players.externalId': externalPlayerId,
      type: contentType,
      'campaigns_players.removedAt': null,
      'campaigns_content.removedAt': null,
    })
    .modify(addCampaignTimeAndStatusCheck)
    .groupBy('content.id')
    .groupBy('players.languageId');

const getPlayerSentContent = async (
  knex: Knex,
  externalPlayerId: Id,
  { pageSize, pageIndex }: { pageSize: number, pageIndex: number } = { pageSize: 10, pageIndex: 1 },
): Promise<{ content: ContentWithEvents[], pagination: any }> =>
  knex('campaigns_players')
    .innerJoin('players', 'players.id', 'campaigns_players.playerId')
    .innerJoin('campaigns_content', 'campaigns_content.campaignId', 'campaigns_players.campaignId')
    .leftJoin('events', (qb) =>
      qb.on('events.campaignContentId', 'campaigns_content.id').on('events.playerId', 'players.id'),
    )
    .innerJoin('content', 'content.id', 'campaigns_content.contentId')
    .innerJoin('content_type', 'content_type.id', 'content.contentTypeId')
    .select(
      'content.id',
      'content.name',
      'content_type.type',
      'players.languageId',
      knex.raw("coalesce(json_agg(events) filter (where events.id is not null), '[]') as events"),
      knex.raw(`(
        case when content_type.type = 'email'
          then campaigns_players."emailSentAt"
          else campaigns_players."smsSentAt" end
        ) as timestamp`),
    )
    .where({ 'players.externalId': externalPlayerId })
    .andWhere((qb) =>
      qb
        .andWhere((qb) => qb.where({ type: 'email' }).whereNot({ emailSentAt: null }))
        .orWhere((qb) => qb.where({ type: 'sms' }).whereNot({ smsSentAt: null })),
    )
    .orderBy('timestamp', 'desc')
    .groupBy('content.id')
    .groupBy('campaigns_players.emailSentAt')
    .groupBy('campaigns_players.smsSentAt')
    .groupBy('content_type.type')
    .groupBy('players.id')
    .paginate({ perPage: pageSize, currentPage: pageIndex })
    .then(({ pagination: { perPage, currentPage, ...pagination }, data }) => ({
      content: data.map(({ id, events, languageId, ...c }) => ({
        ...c,
        previewUrl: new URL(
          `/api/v1/${c.type === 'sms' ? 'smses' : 'emails'}/${id}/preview?lang=${languageId}`,
          config.api.campaignServer.public,
        ).href,
        viewedAt: (events.find(({ text }) => text === 'open') || {}).timestamp,
        clickedAt: (events.find(({ text }) => text === 'click') || {}).timestamp,
      })),
      pagination: { pageSize: perPage, pageIndex: currentPage, ...pagination },
    }));

const updateContent = async (
  knex: Knex,
  contentId: Id,
  { content, ...contentDraft }: ContentUpdate,
  location?: string,
): Promise<ContentWithLocation> => {
  const draft = { ...contentDraft, content: JSON.stringify(content) };
  if (location) {
    const contentType = await knex('content_type')
      .with(
        'ct',
        knex('content')
          .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
          .select('content_type.*')
          .where({ 'content.id': contentId })
          .first(),
      )
      .where({
        brandId: knex.select('brandId').from('ct'),
        location,
        type: knex.select('type').from('ct'),
      })
      .first();
    if (!contentType) {
      return Promise.reject({
        message: `Incorrect location "${location}"`,
        httpCode: 404,
      });
    }

    draft.contentTypeId = contentType.id;
  }

  const [dbContent] = await knex('content').update(draft).where({ id: contentId }).returning('*');

  return { location, ...dbContent };
};

const upsertContent = async (
  knex: Knex,
  { content, ...contentDraft }: ContentDraft,
): Promise<Id> => {
  const { id: contentId } = await upsert2(
    knex,
    'content',
    {
      ...contentDraft,
      updatedAt: new Date(),
      content: JSON.stringify(content),
    },
    ['externalId', 'contentTypeId'],
  );

  return contentId;
};

module.exports = {
  createContent,
  getContentById,
  getContentByName,
  deleteContent,
  getContentList,
  getContentWithInfo,
  getLocalizations,
  getPlayerAvailableContent,
  getPlayerSentContent,
  updateContent,
  upsertContent,
};
