/* @flow */

const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const validate = require('gstech-core/modules/validate');

const { renderNotification } = require('./notificationRenderer');
const { getContentList } = require('../Content/repository');
const config = require('../../config');
const { getDraftPreviewWrapper } = require('../../utils');
const {
  getContentDraftPreviewSchema,
  getContentListSchema,
  getContentPreviewSchema,
} = require('../Content/schemas');

const getNotificationPreview = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getNotificationPreview request', { query: req.query });

    const contentId: Id = Number(req.params.contentId);
    const { lang: languageId } = validate(req.query, getContentPreviewSchema);

    const email = await renderNotification(contentId, {
      firstName: 'Test user',
      languageId,
      currencyId: 'EUR',
    });

    return res.send(email);
  } catch (e) {
    logger.error('getNotificationPreview error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getNotificationDraftPreview = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getNotificationDraftPreview request', { query: req.query });

    const { contentfulId }: { contentfulId: string } = (req.params: any);
    const { brandId, lang: languageId } = validate(req.query, getContentDraftPreviewSchema);

    if (!languageId) {
      const wrapper = await getDraftPreviewWrapper('notifications', brandId, contentfulId);
      return res.send(wrapper);
    }

    const email = await renderNotification(
      contentfulId,
      {
        firstName: 'Test user',
        languageId,
        currencyId: 'EUR',
      },
      { renderDraft: true, brandId },
    );

    return res.send(email);
  } catch (e) {
    logger.error('getNotificationDraftPreview error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getNotifications = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getNotifications request', { query: req.query });

    const { brandId } = validate(req.query, getContentListSchema);

    const emails = await getContentList(pg, { brandId, contentType: 'notification', excludeInactive: true });

    const response: DataResponse<{ id: Id, name: string, title: string }[]> = {
      data: emails.map(({ id, name, content }) => ({
        id,
        name,
        title: (content.en && content.en.title) || content[config.languages[brandId][0].code].title,
      })),
    };
    return res.json(response);
  } catch (e) {
    logger.error('getNotifications error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  getNotificationDraftPreview,
  getNotificationPreview,
  getNotifications,
};
