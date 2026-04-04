/* @flow */
import type { LottoWarehouseBaseRequest } from './types';

const { Router } = require('express');

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');

const operations = require('./operations');
const { handleError } = require('../../utils/errors');
const errors = require('../../utils/errors');
const config = require('../../config');
const schemas = require('./joi');

const router: express$Router<> = Router();  

router.get('/status', (req: express$Request, res: express$Response) => res.json({ ok: true }));

router.post('', async (req: express$Request, res: express$Response) => {
  try {
    logger.debug('lotto-warehouse-api:', req.body);

    const body: LottoWarehouseBaseRequest = await validate(req.body, schemas.generalSchema, 'general schema validation failed');
    if (body.secret !== config.providers.lottoWarehouse.secretKey) {
      throw errors.notAuthorized();
    }

    let data;
    switch (body.request_type) {
      case 'drawing-winners':
        data = await validate(body.data, schemas.drawingwinnersSchema, 'drawing-winners schema validation failed');
        await operations.drawingwinners(data);
        break;
      case 'gametype-update':
        data = await validate(body.data, schemas.gametypeupdateSchema, 'gametype-update schema validation failed');
        await operations.gametypeupdate(data);
        break;
      case 'fx-update':
        data = await validate(body.data, schemas.fxupdateSchema, 'fx-update schema validation failed');
        await operations.fxupdate(data);
        break;
      case 'drawing-update':
        data = await validate(body.data, schemas.drawingupdateSchema, 'drawing-update schema validation failed');
        await operations.drawingupdate(data);
        break;
      case 'drawing-payout-table':
        data = await validate(body.data, schemas.drawingpayouttableSchema, 'drawing-payout-table schema validation failed');
        await operations.drawingpayouttable(data);
        break;
      default:
        throw errors.unknownRequest(body.request_type);
    }

    res.json({ status: 200, message: '', data: {} });
  } catch (e) {
    logger.error('lotto warehouse request call failed:', e, req.body);
    handleError(e, res);
  }
});

module.exports = router;
