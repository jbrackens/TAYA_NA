/* @flow */

const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');

const { addCampaignTimeAndStatusCheck } = require('../utils');
const { campaignEmailsQueue, campaignSmsesQueue } = require('../queues');

type SendCorrespondenceResult = {
  email: number,
  sms: number
}

module.exports = async (
  knex?: Knex,
  campaignId?: Id,
  compareSendingTime?: boolean = false,
): Promise<SendCorrespondenceResult> => {
  try {
    logger.info('sendCorrespondence: starting...');

    const campaigns = await pg('campaigns')
      .select('campaigns.id', 'content_type.type')
      .leftJoin('campaigns_content as cc', 'cc.campaignId', 'campaigns.id')
      .leftJoin('content_type', 'content_type.id', 'cc.contentTypeId')
      .where({ 'cc.removedAt': null, 'campaigns.migrated': false })
      .whereIn('content_type.type', ['email', 'sms'])
      .modify(addCampaignTimeAndStatusCheck)
      .modify((qb) => (campaignId ? qb.where({ 'campaigns.id': campaignId }) : qb))
      .modify((qb) => (knex ? qb.transacting(knex) : qb))
      .andWhere((qb) =>
        qb
          .whereBetween('cc.sendingTime', [
            pg.raw(`(now()::time - '4 minutes'::interval)`),
            pg.raw(`(now()::time + '4 minutes'::interval)`),
          ])
          .orWhere(pg.raw('cc."sendingTime" is null'))
          .modify((qb) =>
            compareSendingTime
              ? qb.orWhereRaw(
                  `(cc."sendingTime" at time zone 'UTC')::time = (campaigns."startTime" at time zone 'UTC')::time`,
                )
              : qb,
          ),
      );

    const smsCampaigns = campaigns.filter((c) => c.type === 'sms');
    const emailCampaigns = campaigns.filter((c) => c.type === 'email');
    logger.info(
      'sendCorrespondence: correspondence counts',
      { sms: smsCampaigns.length },
      { email: emailCampaigns.length },
    );
    emailCampaigns.forEach(({ id }) => {
      campaignEmailsQueue.add({ campaignId: id });
    });
    smsCampaigns.forEach(({ id }) => {
      campaignSmsesQueue.add({ campaignId: id });
    });

    logger.info('sendCorrespondence: finished.');
    return { sms: smsCampaigns.length, email: emailCampaigns.length };
  } catch (e) {
    logger.error('sendCorrespondence: fail', e);
    throw e;
  }
};
