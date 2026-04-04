/* @flow */
const logger = require('../logger');
const configuration = require('../configuration');
const { findPlayer, updatePlayerCache } = require('../modules/legacy-player');
const utils = require('../utils');
const events = require('../events');
const datastorage = require('../datastorage');
const { mapPlayerDetails } = require('../api');

const processDeposit = async (req: express$Request, res: express$Response, next: express$NextFunction) => {
  if (configuration.apiKey() != null && req.headers['x-token'] !== configuration.apiKey()) {
    logger.error('API access with invalid token', req.headers);
    return res.status(400).send({ ok: false, message: 'Invalid authentication' });
  }

  try {
    const { transactionKey } = req.params;
    const { player, deposit } = req.body;
    await updatePlayerCache(mapPlayerDetails(player));
    const localUser = await findPlayer(player.username);
    req.user = localUser;
    utils.initContext(req, res, localUser);
    await events.processDeposit(req, deposit);
    await datastorage.removeFlag('deposit-tx', transactionKey);
    return res.send({ ok: true });
  } catch (e) {
    logger.warn('processDeposit webhook failed', e);
    return next(e);
  }
};

const bind = (app: express$Application<>): express$Application<express$Request, express$Response> => app.post('/api/integration/deposit/:transactionKey', processDeposit);

module.exports = { bind };
