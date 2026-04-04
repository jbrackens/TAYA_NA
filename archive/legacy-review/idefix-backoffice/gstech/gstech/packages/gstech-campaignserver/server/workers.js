// @flow
import type { Job } from 'gstech-core/modules/queue';
import type { PlayerCorrespondenceInfo } from '../types/repository';
import type { SMSPlayerInfo } from '../types/common';

const { axios } = require('gstech-core/modules/axios');
const mockMailer = require('gstech-core/modules/mailer/mockMailer');

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const { send } = require('gstech-core/modules/sms/index');
const slack = require('gstech-core/modules/slack');
const { brandDefinitions } = require('gstech-core/modules/constants');

const {
  campaignEmailsQueue,
  campaignSmsesQueue,
  emailQueue,
  smsQueue,
  emailReportQueue,
} = require('./queues');
const { renderSms } = require('./modules/Smses/smsRenderer');
const { prepareContent } = require('./modules/Emails/emailRenderer');
const { sendEmailsToCampaignAudience } = require('./modules/Emails/emailSender');
const { sendSmsesToCampaignAudience } = require('./modules/Smses/smsSender');
const { processEmailReport } = require('./modules/Integrations/repository');
const { getPlayerSubscriptionToken } = require('./modules/Players/repository');
const config = require('./config');

export type CorrespondenceQueueData = {
  contentId: Id,
  player: PlayerCorrespondenceInfo,
};

const campaignCorrespondenceJob =
  (type: 'sms' | 'email') =>
  async ({ data: { campaignId } }: Job<any>): Promise<any> => {
    let count;

    logger.info(`+++ campaignCorrespondenceJob ${type} ${campaignId}`);

    if (type === 'email') {
      count = await sendEmailsToCampaignAudience(pg, campaignId);
    } else {
      count = await sendSmsesToCampaignAudience(pg, campaignId);
    }

    logger.info(`+++ campaignCorrespondenceJob: send ${type} ${campaignId}: ${count}`);
  };

const emailJob = async ({
  data: {
    player: { campaignPlayerId, ...player },
    link,
    contentId,
    values,
  },
}: Job<any>): Promise<any> => {
  try {
    logger.debug('>>> emailJob start', { player, contentId });
    const data = await pg.transaction(async (tx) => {
      const subscriptionToken = await getPlayerSubscriptionToken(tx, {
        id: player.id,
        email: player.email,
        brandId: player.brandId,
      });
      const { brandId, subject, ...preparedContent } = await prepareContent(
        tx,
        contentId,
        player,
        subscriptionToken,
        { link, values },
      );
      const emailFrom = `noreply@${config.sendGrid[brandId].domain}`;
      const replyTo = `support@${config.sendGrid[brandId].domain}`;
      const { name } = brandDefinitions[brandId];

      if (campaignPlayerId) {
        const updated = await tx('campaigns_players')
          .where({ id: campaignPlayerId, emailSentAt: null })
          .update({ emailSentAt: new Date() });

        if (updated === 0) {
          logger.info(
            `Email to ${player.email}, campaignPlayerId: ${campaignPlayerId} already sent!`,
          );
          return null;
        }
      }

      logger.debug('+++ emailJob transaction complete', { player, contentId });

      return { emailFrom, replyTo, name, subject, brandId, preparedContent };
    });

    if (!data) {
      logger.warn('!!! emailJob data is falsy', { player, contentId });
      return true;
    }

    if (config.isProduction) {
      const body = {
        from: {
          email: data.emailFrom,
          name: data.name,
        },
        reply_to: {
          email: data.replyTo,
          name: data.name,
        },
        template_id: config.sendGrid[data.brandId].templateId,
        subject: data.subject,
        personalizations: [
          {
            to: [
              {
                email: player.email,
              },
            ],
            dynamic_template_data: {
              ...data.preparedContent,
              subject: data.subject,
            },
            custom_args: {
              campaignPlayerId,
              contentId,
            },
          },
        ],
      };

      const r = await axios.request({
        method: 'POST',
        url: 'https://api.sendgrid.com/v3/mail/send',
        headers: {
          Authorization: `Bearer ${config.sendGrid.apiKeys.send}`,
          'content-type': 'application/json',
        },
        data: body,
      });
      logger.debug('<<< emailJob SendGrid', { data: r.data, status: r.status, player, contentId });

      if (r.status !== 202)
        logger.warn('XXX emailJob SendGrid', { status: r.status, data: r.data });

      return true;
    }

    if (config.mailer.mockMailerPort)
      return await mockMailer.sendMail({
        from: data.emailFrom,
        to: player.email,
        subject: data.subject,
        html: data.preparedContent.content,
      });

    return slack.testMessage(
      'email',
      `Email for *${player.email}*: ${data.subject}, campaignPlayerId: ${campaignPlayerId}
      ${data.preparedContent.content}`,
    );
  } catch (e) {
    return logger.error('XXX emailJob', e);
  }
};

const emailReportJob = ({ data }: Job<any>) => processEmailReport(data);

const smsJob = async ({
  data,
}: {
  data: {
    contentId: Id,
    mobilePhone: string,
    campaignPlayerId: Id,
    player: SMSPlayerInfo,
  },
  ...
}): Promise<any> => {
  try {
    const { contentId, mobilePhone, campaignPlayerId, player } = data;
    logger.debug('DEBUGGER sms job start', { player, contentId });
    const updated = await pg('campaigns_players')
      .where({ id: campaignPlayerId, smsSentAt: null })
      .update({ smsSentAt: new Date() });
    if (updated === 0) {
      return logger.info(
        `SMS to ${mobilePhone}, campaignPlayerId: ${campaignPlayerId} already sent!`,
      );
    }
    const { content, brandId } = await renderSms(contentId, player);

    const result = await send(mobilePhone, content[(player.languageId: any)], { brandId });
    if (!result.ok) {
      // In case sending fail, do not repeat
      // await pg('campaigns_players').where({ id: campaignPlayerId }).update({ smsSentAt: null });
      if (result.message === 'Invalid phone number') {
        await pg('players').update({ invalidMobilePhone: true }).where({ id: player.id });
        return logger.info(`Player ${player.id || ''} mobile phone ${mobilePhone} marked invalid`);
      }
      return logger.error('sms send failed', result.message, JSON.stringify(data));
    }

    logger.debug('DEBUGGER sms job end', { player, contentId, result });
    return true;
  } catch (e) {
    return logger.error('smsJob error not handled', e);
  }
};

const init = async () => {
  campaignEmailsQueue.process(campaignCorrespondenceJob('email'), 1);
  campaignSmsesQueue.process(campaignCorrespondenceJob('sms'), 1);
  emailQueue.process(emailJob, 10);
  emailReportQueue.process(emailReportJob, 3);
  smsQueue.process(smsJob, 3);
};

module.exports = { init, smsJob };
