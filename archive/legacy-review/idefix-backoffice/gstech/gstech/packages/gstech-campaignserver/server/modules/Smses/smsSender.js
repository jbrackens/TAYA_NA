// @flow
import type { SMSPlayerInfo } from '../../../types/common';

const logger = require('gstech-core/modules/logger');
const through2 = require('through2');

const { getCampaignPlayersForSendingCorrespondence } = require('../Campaigns/repository');
const { getCampaignContent } = require('../Campaigns/CampaignContent/repository');
const { smsQueue } = require('../../queues');

type SendSmsOptions = { mobilePhone?: string, campaignPlayerId: Id, ...SMSPlayerInfo };
const sendSms = async (
  contentId: Id,
  { mobilePhone, campaignPlayerId, ...player }: SendSmsOptions,
): Promise<boolean> => {
  if (!mobilePhone) {
    logger.warn('sendSms is not possible as player is missing mobilePhone', { player });
    return false;
  }
  try {
    smsQueue.add({
      contentId,
      campaignPlayerId,
      mobilePhone,
      player,
    });
    return true;
  } catch (e) {
    logger.error('sendSms', e);
    return false;
  }
};

const sendSmsesToCampaignAudience = async (knex: Knex, campaignId: Id): Promise<number> => {
  const [campaignSms] = await getCampaignContent(knex, campaignId, 'sms');
  if (!campaignSms) {
    return Promise.reject({
      httpCode: 409,
      message: `Cannot find attached sms template to campaign id ${campaignId}`,
    });
  }
  const campaignPlayersStream = getCampaignPlayersForSendingCorrespondence(
    knex,
    campaignId,
    campaignSms,
  );
  let counter = 0;
  // eslint-disable-next-line no-promise-executor-return
  await new Promise((resolve, error) => campaignPlayersStream
    .pipe(through2.obj({ highWaterMark: 10 }, async (player, enc, done) => {
      // eslint-disable-next-line no-plusplus
      counter++;
      await sendSms(campaignSms.contentId, player);
      done();
    }))
    .on('finish', resolve)
    .on('error', error));
  return counter;
};

module.exports = {
  sendSms,
  sendSmsesToCampaignAudience,
};
