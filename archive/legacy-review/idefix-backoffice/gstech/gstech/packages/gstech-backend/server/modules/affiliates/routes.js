/* @flow */
const logger = require('gstech-core/modules/logger');
const Affiliate = require('./Affiliate');

const getAffiliates = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const affiliates = await Affiliate.get();
    return res.json(affiliates).status(200);
  } catch (err) {
    logger.warn('Get affiliates failed');
    return next(err);
  }
};

module.exports = {
  getAffiliates,
};
