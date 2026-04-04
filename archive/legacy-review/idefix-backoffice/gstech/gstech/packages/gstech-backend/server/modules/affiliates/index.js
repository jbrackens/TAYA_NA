/* @flow */
const Affiliate = require('./Affiliate');
const routes = require('./routes');
const { getAffiliateRegistrationsReportHandler, getAffiliateActivitiesReportHandler } = require('./api-routes');

module.exports = {
  findAffiliate: Affiliate.find,
  parseAffiliateId: Affiliate.parseAffiliateId,
  apiRoutes: {
    getAffiliateRegistrationsReportHandler,
    getAffiliateActivitiesReportHandler,
  },
  routes: {
    getAffiliatesHandler: routes.getAffiliates,
  },
};
