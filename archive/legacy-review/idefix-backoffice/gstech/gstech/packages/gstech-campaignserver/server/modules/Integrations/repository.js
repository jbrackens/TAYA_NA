/* @flow */
import type { Player } from '../Players/repository';

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const { reportFraud } = require('gstech-core/modules/clients/backend-bonus-api');

const { createEvent } = require('../Events/repository');
const { getPlayer } = require('../Players/repository');
const ContentfulImport = require('../Content/ContentfulImport');
const { upsertContent } = require('../Content/repository');

export type Bounce = {
  email?: string,
  event: string,
  reason: string,
  campaignPlayerId: Id,
  contentId: Id,
};

const isSpam = (note: string) =>
  note.indexOf('rejected Your IP') !== -1 ||
  note.indexOf(' spam ') !== -1 ||
  note.indexOf('SPAM id=') !== -1 ||
  note.indexOf('Spamhaus') !== -1 ||
  note.indexOf('SPAM type=spam') !== -1 ||
  note.indexOf('No SPAM') !== -1 ||
  note.indexOf('OX_604') !== -1 ||
  note.indexOf('Reject due to policy restrictions') !== -1 ||
  note.indexOf('Content scanner malfunction') !== -1 ||
  note.indexOf('Our system has detected an unusual rate') !== -1 ||
  note.indexOf('www.virusfree.cz') !== -1;

const isFullMailbox = (response: string) =>
  response.toLowerCase().indexOf('quota') !== -1 ||
  response.toLowerCase().indexOf('mailbox is full') !== -1 ||
  response.toLowerCase().indexOf('mailbox size limit exceeded') !== -1;

const isBlocked = (response: string) =>
  response.toLowerCase().indexOf('low reputation of the sending domain') !== -1;

const processBounce = async (
  player: Player,
  bounce: { contentId: Id, ... },
  campaignId: Id,
  response: string,
) => {
  let extras;
  const event = {
    text: 'bounced',
    playerId: player.id,
    contentId: bounce.contentId,
    campaignId,
  };
  if (isFullMailbox(response)) {
    extras = { reason: `Mailbox is full and message cannot be delivered: ${response}` };
  } else if (isSpam(response)) {
    extras = { reason: `Unable to deliver email: ${response}` };
  } else if (isBlocked(response)) {
    // In case of blocked message, handle the report automatically,
    // but do not mark email as invalid, so an email can be sent again in the future
    await createEvent(pg, {
      ...event,
      extras: { reason: `Message blocked for domain of brand ${player.brandId}` },
    });
    return true;
  } else if (player.email) {
    const { email } = player;
    logger.warn(`reportFraud: Reporting email fraud for ${email}`, response, bounce);
    await reportFraud(player.brandId, player.externalId, {
      username: player.username,
      fraudKey: 'invalid_email_address',
      fraudId: email,
      details: { email: player.email, response },
    });
  } else {
    // TODO: need to check if how acceptable it is
    logger.warn('reportFraud: missing email address', { player, bounce });
  }

  await createEvent(pg, { ...event, extras });

  await pg('players').update({ invalidEmail: true }).where({ id: player.id });
  return true;
};

const processEmailReport = async (bounce: Bounce) => {
  logger.info('++++ SENDGRID::processEmailReport', { bounce });
  const { reason, campaignPlayerId, event, contentId } = bounce;
  const { campaignId, playerId } = await pg('campaigns_players')
    .where({ id: campaignPlayerId })
    .first();
  const player = await getPlayer(pg, { id: playerId });
  if (player) {
    if (event === 'bounce') await processBounce(player, bounce, campaignId, reason || '');
    else if (event === 'spamreport')
      await processBounce(player, bounce, campaignId, 'Player marked mail as spam!');
    else if (['delivered', 'click', 'open'].includes(event))
      await createEvent(pg, {
        text: event,
        playerId: player.id,
        contentId,
        campaignId,
      });
    else logger.warn('!!!! SENDGRID::processEmailReport', 'UNHANDLED RECEIPT', { bounce });
  } else logger.error('XXXX SENDGRID::processEmailReport', 'PLAYER NOT FOUND', { bounce });
};

const deleteContent = async (externalId: string): Promise<any> =>
  await pg('content').where({ externalId }).del();

const publishContent = async (body: any, brandId: BrandId) => {
  const ci = new ContentfulImport(brandId);

  const map = {
    notification: {
      // $FlowFixMe[method-unbinding]
      method: ci.parseNotifications.bind(ci),
      type: 'notification',
    },
    mailer: {
      // $FlowFixMe[method-unbinding]
      method: ci.parseMailers.bind(ci),
      type: 'email',
    },
    message: {
      // $FlowFixMe[method-unbinding]
      method: ci.parseMessages.bind(ci),
      type: 'sms',
    },
    localization: {
      // $FlowFixMe[method-unbinding]
      method: ci.parseLocalizations.bind(ci),
      type: 'localization',
    },
  };

  let contentfulType;
  try {
    contentfulType = body.sys.contentType.sys.id;
  } catch (e) {
    throw new Error('Invalid body!');
  }

  const contentType = await pg('content_type')
    .where({ type: map[contentfulType].type, brandId })
    .first();
  if (!contentType) {
    throw new Error(`Cannot find type ${map[contentfulType].type} for brand ${brandId}`);
  }

  const rawContent = await map[contentfulType].method([body]);
  const key = Object.keys(rawContent)[0];
  const { externalId, type, ...content } = rawContent[key];
  await upsertContent(pg, {
    contentTypeId: contentType.id,
    name: key,
    externalId,
    content,
    subtype: type,
    status: 'published',
    active: true,
  });
};

module.exports = {
  deleteContent,
  processEmailReport,
  publishContent,
};
