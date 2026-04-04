/* @flow */
const api = require('../api');
const configuration = require('../configuration');
const utils = require('../utils');
const logger = require('../logger');
const { emailDirect } = require('../queue');

const sendActivation = async (req: express$Request): Promise<{ ok: boolean }> => {
  try {
    logger.debug('>>>>>>> sendActivation', { user: req.user, context: req.context });
    const { user } = req;
    const { activationToken } = await api.requestActivationToken({ user });
    const properties = {
      firstName: user.details.FirstName,
      link: configuration.baseUrl(
        `/${user.languageISO}/activate/${encodeURIComponent(activationToken)}`,
      ),
    };
    logger.info('+++++++ sendActivation', { email: user.email, properties });
    await emailDirect(
      'activation',
      user.email,
      req.context.languageISO,
      req.context.currencyISO,
      properties,
    );
    const response = { ok: true };
    logger.debug('<<<<<<< sendActivation', { response });
    return response;
  } catch (e) {
    const response = { ok: false };
    logger.warn('!!!!!!! sendActivation FAILED', { error: e, stack: e.stack, response });
    return response;
  }
};

const activate = async (
  req: express$Request,
  res: express$Response,
  activateCode: string,
): Promise<any> => {
  const payload = { activateCode, ipAddress: utils.getRemoteAddress(req) };
  logger.debug('>>> activate', { payload });
  const response = await api.PlayerActivateAccount(payload);
  logger.debug('<<< activate', { response });
  return response;
};

module.exports = { activate, sendActivation };
