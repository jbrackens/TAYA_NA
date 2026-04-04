/* @flow */
const { Router } = require('express');
const find = require('lodash/find');
const logger = require('gstech-core/modules/logger');
const PragmaticOperations = require('./PragmaticOperations');
const { calculateHash } = require('./hash');
const { errors } = require('./types');
const config = require('../../../config');

const configuration = config.providers.pragmatic;

const router: express$Router<> = Router();  

router.use((req: express$Request, res: express$Response, next: express$NextFunction) => {
  logger.debug('Pragmatic req', req.body);
  next();
});

const success = (res: express$Response, response: any) => {
  const resp = { error: errors.SUCCESS, description: 'Success', ...response };
  logger.debug('Pragmatic response', resp);
  return res.json(resp);
};

const handleError = (res: express$Response, error: any) => {
  logger.warn('PragmaticPlay error', error);
  if (error.error != null && error.description != null) {
    return res.json(error);
  }
  return res.json({ error: errors.INTERNAL_SERVER_ERROR_RETRY, description: 'Internal server error' });
};

const verifyRequest = async (body: any) => {
  const brand = find((configuration.brands: any), i => i.providerId === body.providerId);
  if (brand == null) {
    return Promise.reject({ error: errors.INVALID_HASH, description: 'Invalid providerId' });
  }
  const hash = calculateHash(brand.secretKey, body);
  if (body.hash !== hash) {
    return Promise.reject({ error: errors.INVALID_HASH, description: 'Invalid hash' });
  }
  return true;
};

const ops = {
  authenticate: PragmaticOperations.authenticate,
  balance: PragmaticOperations.balance,
  bet: PragmaticOperations.bet,
  result: PragmaticOperations.result,
  bonusWin: PragmaticOperations.bonusWin,
  jackpotWin: PragmaticOperations.jackpotWin,
  endRound: PragmaticOperations.endRound,
  refund: PragmaticOperations.refund,
};

router.post(/\/(.*)\.html/, async (req: express$Request, res: express$Response, next: express$NextFunction) => {
  try {
    const { body } = req;
    // $FlowFixMe[invalid-computed-prop]
    const operation = ops[req.params['0']];
    if (operation == null) {
      return next();
    }
    await verifyRequest(body);
    const response = await operation(body);
    return success(res, response);
  } catch (e) {
    return handleError(res, e);
  }
});

module.exports = router;
