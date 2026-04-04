/* @flow */
const _ = require('lodash');
const logger = require('gstech-core/modules/logger');
const { emailReportQueue } = require('../../queues');
const { deleteContent, publishContent } = require('./repository');

const contentfulWebhookHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    const { body, params, headers } = req;
    logger.debug('>>> CONTENTFUL::webhookHandler', { body, params, headers });
    const { brandId }: { brandId: BrandId } = (params: any);
    const topic = req.header('X-Contentful-Topic');
    if (!topic) throw new Error(`X-Contentful-Topic not found`);
    if (topic.includes('publish')) await publishContent(body, brandId);
    else if (topic.includes('delete')) await deleteContent(body.sys.id);
    else return res.status(400).json({ error: { message: `Topic ${topic} cannot be handled` } });
    return res.json({ data: { ok: true } });
  } catch (err) {
    logger.error('XXX CONTENTFUL::webhookHandler', { err });
    return res.status(400).json({ error: { message: err.message } });
  }
};

const emailReportHandler = async (
  { body }: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.info('>>> SENDGRID::emailReportHandler', { events: _.countBy(body, 'event') });
    body.forEach((b) => emailReportQueue.add(b, { priority: 1000 }));
    return res.json({ data: { ok: true } });
  } catch (err) {
    logger.error('XXX SENDGRID::emailReportHandler', { err });
    return res.json({ data: { ok: false } });
  }
};

module.exports = { contentfulWebhookHandler, emailReportHandler };
