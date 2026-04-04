/* @flow */

const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const validate = require('gstech-core/modules/validate');

const config = require('../../config');
const { getContentList } = require('../Content/repository');
const { renderSms } = require('./smsRenderer');
const { sendContentForExternalCampaign } = require('../Emails/emailSender');
const {
  getContentDraftPreviewSchema,
  getContentListSchema,
  sendContentForExternalCampaignSchema,
} = require('../Content/schemas');

const getSmsDraftPreview = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getSmsDraftPreview request', { params: req.params, query: req.query });

    const { contentfulId }: { contentfulId: Id } = (req.params: any);
    const { brandId } = validate(req.query, getContentDraftPreviewSchema);

    const { content } = await renderSms(
      contentfulId,
      {
        firstName: 'Test user',
        currencyId: 'EUR',
      },
      { renderDraft: true, brandId },
    );

    const response: DataResponse<{ [string]: string }> = { data: content };
    return res.json(response);
  } catch (e) {
    logger.error('getSmsDraftPreview error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getSmses = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getSmses request', { query: req.query });

    const { brandId } = validate(req.query, getContentListSchema);

    const smses = await getContentList(pg, { brandId, contentType: 'sms', excludeInactive: true });

    const response: DataResponse<{ id: Id, name: string, text: string }[]> = {
      data: smses.map(({ id, name, content }) => ({
        id,
        name,
        text: (content.en && content.en.text) || content[config.languages[brandId][0].code].text,
      })),
    };
    return res.json(response);
  } catch (e) {
    logger.error('getSmses error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getSmsPreview = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getSmsPreview request', { params: req.params });

    const contentId: Id = Number(req.params.contentId);

    const { content } = await renderSms(contentId, {
      firstName: 'Test user',
      currencyId: 'EUR',
    });

    const response: DataResponse<{ [string]: string }> = { data: content };
    return res.json(response);
  } catch (e) {
    logger.error('getSmsPreview error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const sendSmsForExternalCampaign = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('sendSmsForExternalCampaign request', { params: req.params });

    const { name, playerId, brandId } = validate(req.body, sendContentForExternalCampaignSchema);

    await sendContentForExternalCampaign(pg, name, playerId, brandId, 'sms');

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.json(response);
  } catch (e) {
    logger.warn('sendSmsForExternalCampaign error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  getSmsDraftPreview,
  getSmses,
  getSmsPreview,
  sendSmsForExternalCampaign,
};
