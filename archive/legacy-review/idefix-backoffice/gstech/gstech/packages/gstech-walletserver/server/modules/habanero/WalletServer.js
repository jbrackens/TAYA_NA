/* @flow */
import type { HabaneroRequest, HabaneroStatus } from './types';

const { Router } = require('express');
const bodyParser = require('body-parser');
const logger = require('gstech-core/modules/logger');
const HabaneroOperations = require('./HabaneroOperations');
const config = require('../../../config');

const configuration = config.providers.habanero;

const router: express$Router<> = Router();  
router.use(bodyParser.json());

const success = (res: express$Response, type: string, response: HabaneroStatus) => {
  logger.debug('Habanero response', response);
  return res.json(response);
};

const handleError = (res: express$Response, type: string, error: HabaneroStatus) => {
  if (error.success != null) {
    const errorResponse = {
      [type]: {
        status: error,
      },
    };
    logger.warn('Habanero error', type, errorResponse);
    return res.json(errorResponse);
  }

  const errorResponse2 = {
    [type]: {
      status: {
        success: false,
        message: 'Operation failed',
      },
    },
  };
  logger.error('Habanero error', type, errorResponse2, error);
  return res.json(errorResponse2);
};

const verifyRequest = async (body: HabaneroRequest) => {
  if (body.auth == null) {
    return Promise.reject({ success: false, message: 'Invalid request' });
  }
  if (body.auth.username === configuration.username && body.auth.passkey === configuration.passkey) {
    return true;
  }
  return Promise.reject({ success: false, message: 'Authentication failed' });
};

const ops = {
  playerdetailrequest: HabaneroOperations.playerdetailrequest,
  fundtransferrequest: HabaneroOperations.fundtransferrequest,
  queryrequest: HabaneroOperations.queryrequest,
};

const responsetypes = {
  playerdetailrequest: 'playerdetailresponse',
  fundtransferrequest: 'fundtransferresponse',
  queryrequest: 'fundtransferresponse',
};

router.use(async (req: express$Request, res: express$Response, next: express$NextFunction) => {
  logger.debug('Habanero req', req.body, req.headers);
  const { body } = req;
  try {
    const operation = ops[body.type];
    if (operation == null) {
      return next();
    }
    await verifyRequest(body);
    const response = await operation(body);
    return success(res, responsetypes[body.type], response);
  } catch (e) {
    return handleError(res, responsetypes[body.type], e);
  }
});

module.exports = router;
