// @flow
import type { EmailPlayerInfo } from '../../../types/common';

const through2 = require('through2');

const logger = require('gstech-core/modules/logger');
const { sendSms } = require('../Smses/smsSender');
const { emailQueue } = require('../../queues');
const { upsertCampaign } = require('../Campaigns/repository');
const { getCampaignPlayersForSendingCorrespondence } = require('../Campaigns/repository');
const {
  createCampaignContent,
  getCampaignContent,
} = require('../Campaigns/CampaignContent/repository');

type SendEmailOptions = { link?: string, campaignPlayerId?: Id, values?: { [key: string]: string } };
const sendEmail = async (
  contentId: Id,
  player: EmailPlayerInfo,
  { link, values }: SendEmailOptions = {},
): Promise<any> => {
  if (!player.email) {
    logger.warn('reportFraud is not possible as player is missing email', { player });
    return false;
  }

  logger.warn('sendEmail: adding to queue', { player, link, contentId, values });

  return emailQueue.add({ player, link, contentId, values });
}

const sendEmailsToCampaignAudience = async (knex: Knex, campaignId: Id): Promise<number> => {
  logger.debug(`sendEmailsToCampaignAudience start: ${campaignId}`, { campaignId });
  const [campaignEmail] = await getCampaignContent(knex, campaignId, 'email');

  logger.debug(`sendEmailsToCampaignAudience: campaignEmail ${campaignId}`, { campaignId, campaignEmail });

  if (!campaignEmail) {
    return Promise.reject({
      httpCode: 409,
      message: `Cannot find attached email template to campaign id ${campaignId}`,
    });
  }

  const campaignPlayersStream = getCampaignPlayersForSendingCorrespondence(
    knex,
    campaignId,
    campaignEmail,
  );

  logger.debug(`sendEmailsToCampaignAudience: query ${campaignId}`, { campaignId, query: campaignPlayersStream.toString() });
  let counter = 0;
  // eslint-disable-next-line no-promise-executor-return
  await new Promise((resolve, error) => campaignPlayersStream
    .pipe(through2.obj({highWaterMark: 10}, async (player, enc, done) => {
      // eslint-disable-next-line no-plusplus
      counter++;
      await sendEmail(campaignEmail.contentId, player);
      done();
    }))
    .on('error', error)
    .on('finish', resolve)
  );
  return counter;
};

// Couldn't put that in 'Campaigns' module because of circular dependency...
const sendContentForExternalCampaign = async (
  knex: Knex,
  name: string,
  externalPlayerId: Id,
  brandId: BrandId,
  contentType: 'sms' | 'email' = 'email',
): Promise<any> => {
  const content = await knex('content')
    .select('content.*')
    .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
    .where({ type: contentType, brandId, name })
    .first();
  if (!content) {
    return Promise.reject({
      message: `Could not find an ${contentType} of name ${name} for brand ${brandId}`,
      httpCode: 403,
    });
  }

  const player = await knex('players').where({ externalId: externalPlayerId, brandId }).first();
  if (!player) {
    return Promise.reject({
      message: `Could not find a player of id ${externalPlayerId}`,
      httpCode: 403,
    });
  }
  const { id: campaignId } = await upsertCampaign(knex, {
    status: 'draft',
    audienceType: 'static',
    migrated: true,
    name,
    brandId,
  }, true);

  const campaignContent = await knex('campaigns_content')
    .leftJoin('content_type', 'content_type.id', 'campaigns_content.contentTypeId')
    .where({ campaignId, type: contentType, brandId })
    .first();
  if (!campaignContent) {
    await createCampaignContent(knex, campaignId, { contentId: content.id });
  }

  const campaignPlayer = await knex('campaigns_players')
    .where({ playerId: player.id, campaignId })
    .first();
  let campaignPlayerId = campaignPlayer && campaignPlayer.id;
  if (!campaignPlayerId) {
    [{ id: campaignPlayerId }] = await knex('campaigns_players')
      .insert({
        playerId: player.id,
        addedAt: new Date(),
        campaignId,
      })
      .returning('id');
  } else if (
    (contentType === 'email' && campaignPlayer.emailSendAt !== null) ||
    (contentType === 'sms' && campaignPlayer.smsSentAt !== null)
  ) {
    return Promise.reject({ message: `${contentType} already sent`, httpCode: 403 });
  }

  return contentType === 'email'
    ? sendEmail(content.id, { ...player, campaignPlayerId })
    : sendSms(content.id, { ...player, campaignPlayerId });
};

module.exports = {
  sendEmail,
  sendEmailsToCampaignAudience,
  sendContentForExternalCampaign,
};
