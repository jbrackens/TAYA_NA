/* @flow */
const logger = require('gstech-core/modules/logger');
// const validate = require('gstech-core/modules/validate');
// const money = require('gstech-core/modules/money');

// const AffiliateRegistrationReport = require('../reports/AffiliateRegistrationReport');
// const AffiliateActivityReport = require('../reports/AffiliateActivityReport');
// const { reportRequestSchema } = require('./schemas');

const getAffiliateRegistrationsReportHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    // disable api
    return res.status(503).send('Not available');
    // logger.debug('getAffiliateRegistrationsReportHandler request', { body: req.body });
    // const { brandId }: { brandId: BrandId } = (req.params: any);
    // const reportRequest = await validate(req.body, reportRequestSchema, 'getAffiliateRegistrationsReportHandler schema validation failed');

    // const registrations = await AffiliateRegistrationReport.report(reportRequest.date, brandId);

    // return res.json(registrations.map(r => ({ ...r, playerId: Number(r.playerId) })));
  } catch (e) {
    logger.warn('getAffiliateRegistrationsReportHandler failed', e);
    return next(e);
  }
};

const getAffiliateActivitiesReportHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    // disable api
    return res.status(503).send('Not available');
    // logger.debug('getAffiliateActivityReportHandler request', { body: req.body });
    // const { brandId }: { brandId: BrandId } = (req.params: any);
    // const reportRequest = await validate(req.body, reportRequestSchema, 'getAffiliateActivityReportHandler schema validation failed');

    // const activities = await AffiliateActivityReport.report(reportRequest.date, brandId);
    // return res.json(activities.map(a => ({ ...a,
    //   affiliateId: Number(a.affiliateId),
    //   grossRevenue: money.parseMoney(a.grossRevenue),
    //   bonuses: money.parseMoney(a.bonuses),
    //   adjustments: money.parseMoney(a.adjustments),
    //   turnover: money.parseMoney(a.turnover),
    //   deposits: money.parseMoney(a.deposits),
    // })));
  } catch (e) {
    logger.warn('getAffiliateActivityReportHandler failed', e);
    return next(e);
  }
};

module.exports = {
  getAffiliateRegistrationsReportHandler,
  getAffiliateActivitiesReportHandler,
};
