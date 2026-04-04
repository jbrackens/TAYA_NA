/* @flow */
const { Router } = require('express');
const logger = require('gstech-core/modules/logger');
const YggdrasilOperations = require('./YggdrasilOperations');
const { errors } = require('./types');

const router: express$Router<> = Router();  

router.use((req: express$Request, res: express$Response, next: express$NextFunction) => {
  logger.debug('Yggdrasil req', req.query);
  next();
});

const success = (res: express$Response, data: any) => {
  const resp = { code: errors.SUCCESS, data };
  logger.debug('Yggdrasil response', resp);
  return res.json(resp);
};

const handleError = (res: express$Response, error: any) => {
  logger.warn('Yggdrasil error', error);
  if (error.code != null && error.msg != null) {
    return res.json(error);
  }
  if (error != null && error.message != null) {
    return res.json({ code: errors.ERROR, msg: error.message });
  }
  return res.json({ code: errors.ERROR, msg: error });
};

const ops = {
  playerinfo: YggdrasilOperations.playerinfo,
  wager: YggdrasilOperations.wager,
  cancelwager: YggdrasilOperations.cancelwager,
  appendwagerresult: YggdrasilOperations.appendwagerresult,
  endwager: YggdrasilOperations.endwager,
  campaignpayout: YggdrasilOperations.campaignpayout,
  getbalance: YggdrasilOperations.getbalance,
};

router.get(/\/(.*)\.json/, async (req: express$Request, res: express$Response, next: express$NextFunction) => {
  try {
    const body: any = req.query;
    // $FlowFixMe[invalid-computed-prop]
    const operation = ops[req.params['0']];
    if (operation == null) {
      return next();
    }
    const response = await operation(body);
    return success(res, response);
  } catch (e) {
    return handleError(res, e);
  }
});

module.exports = router;
