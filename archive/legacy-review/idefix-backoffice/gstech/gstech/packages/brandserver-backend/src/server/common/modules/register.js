/* @flow */
const _ = require('lodash');
const { handleError } = require('../extensions');
const { register } = require('./player');
const logger = require('../logger');
const { getNextUrlAfterLogin } = require('./login');

const registrationHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> registrationHandler', { body: req.body });
    const result = await register(req, res, req.body);
    const extras = { nextUrl: req.body.nextUrl };
    if (result.activated) {
      const nextUrl = await getNextUrlAfterLogin(req);
      extras.nextUrl = req.body.nextUrl || nextUrl;
    }
    const r = _.extend(extras, result);
    logger.debug('<<< registrationHandler', {
      username: req.user && req.user.username,
      r,
    });
    return res.json(r);
  } catch (e) {
    logger.warn('XXX registrationHandler', { e, stack: e.stack });
    return handleError(req, res, e);
  }
};

module.exports = {
  registrationHandler,
};
