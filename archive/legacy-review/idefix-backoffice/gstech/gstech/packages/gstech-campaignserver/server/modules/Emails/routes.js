/* @flow */

const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const validate = require('gstech-core/modules/validate');

const config = require('../../config');
const { getContentList } = require('../Content/repository');
const { renderEmail } = require('./emailRenderer');
const { sendEmail } = require('./emailSender');
const { sendContentForExternalCampaign } = require('./emailSender');
const {
  getContentDraftPreviewSchema,
  getContentListSchema,
  getContentPreviewSchema,
  sendContentForExternalCampaignSchema,
  sendEmailDirectlySchema,
} = require('../Content/schemas');
const { getDraftPreviewWrapper } = require('../../utils');

const getEmailDraftPreview = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getEmailDraftPreview request', { params: req.params, query: req.query });

    const { contentfulId }: { contentfulId: string } = (req.params: any);
    const { lang: languageId, brandId } = validate(req.query, getContentDraftPreviewSchema);

    if (!languageId) {
      const wrapper = await getDraftPreviewWrapper('emails', brandId, contentfulId);
      return res.send(wrapper);
    }

    const email = await renderEmail(
      contentfulId,
      {
        firstName: 'Test user',
        languageId,
        currencyId: 'EUR',
        email: 'test@gmail.com',
      },
      { renderDraft: true, brandId, values: { pinCode: '123123' } },
    );

    return res.send(email);
  } catch (e) {
    logger.error('getEmailPreview error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getEmailPreview = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getEmailPreview request', { params: req.params, query: req.query });

    const contentId: Id = Number(req.params.contentId);
    const { lang: languageId } = validate(req.query, getContentPreviewSchema);

    const email = await renderEmail(
      contentId,
      {
        firstName: 'Test user',
        languageId,
        currencyId: 'EUR',
        email: 'test@gmail.com',
      },
      { values: { pinCode: '123123' } },
    );

    return res.send(email);
  } catch (e) {
    logger.error('getEmailPreview error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getEmails = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getEmails request', { query: req.query });

    const { brandId } = validate(req.query, getContentListSchema);

    const emails = await getContentList(pg, { brandId, contentType: 'email', excludeInactive: true });

    const response: DataResponse<{ id: Id, name: string, subject: string }[]> = {
      data: emails.map(({ id, name, content }) => ({
        id,
        name,
        subject: content.en.subject || content[config.languages[brandId][0].code].subject,
      })),
    };
    return res.json(response);
  } catch (e) {
    logger.error('getEmails error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const sendEmailDirectly = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('sendEmailDirectly request', { body: req.body });
    const { link, mailerId, values, ...player } = validate(req.body, sendEmailDirectlySchema);

    const content = await pg('content')
      .select('content.id')
      .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
      .where({ name: mailerId, brandId: player.brandId, type: 'email' })
      .first();
    if (!content) {
      return res
        .status(404)
        .json({ error: { message: `Content ${mailerId} not found for brand ${player.brandId}` } });
    }

    await sendEmail(content.id, player, { link, values });

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.json(response);
  } catch (e) {
    logger.error('sendEmailDirectly error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const sendEmailForExternalCampaign = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { name, playerId, brandId } = validate(req.body, sendContentForExternalCampaignSchema);

    logger.debug('sendEmailForExternalCampaign request', { name, playerId, brandId });
    await pg.transaction((tx) => sendContentForExternalCampaign(tx, name, playerId, brandId));
    logger.debug('sendEmailForExternalCampaign request done', { name, playerId, brandId });

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.json(response);
  } catch (e) {
    logger.warn('sendEmailForExternalCampaign error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  getEmailDraftPreview,
  getEmailPreview,
  getEmails,
  sendEmailDirectly,
  sendEmailForExternalCampaign,
};
