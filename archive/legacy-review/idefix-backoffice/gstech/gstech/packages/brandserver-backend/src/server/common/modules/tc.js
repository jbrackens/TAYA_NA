/* @flow */
const { handleError } = require('../extensions');
const configuration = require('../configuration');
const logger = require('../logger');
const api = require('../api');
const { updateDetails } = require('./player');

const CURRENT_TC_VERSION = configuration.currentTcVersion;

const getTcOk = async (req: express$Request): Promise<boolean> => {
  const ok = req.user.details.TCVersion === CURRENT_TC_VERSION;
  if (!ok) {
    logger.debug('Request TC', req.user.username, req.user.details.TCVersion, req.user.details, CURRENT_TC_VERSION);
  }
  return ok;
};

const tcAcceptHandler = async (req: express$Request, res: express$Response): Promise<void> => {
  try {
    await api.updateTcVersion(req, CURRENT_TC_VERSION);
    await updateDetails(req);
    res.json({ ok: true });
  } catch (e) {
    handleError(req, res, e);
  }
};

module.exports = { getTcOk, tcAcceptHandler };
