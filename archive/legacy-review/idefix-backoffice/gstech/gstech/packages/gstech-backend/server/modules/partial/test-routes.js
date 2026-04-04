/* @flow */
// import type { PlayerDraft } from 'gstech-core/modules/types/player';

const { v1: uuid } = require('uuid');
const joi = require('gstech-core/modules/joi');
const validate = require('gstech-core/modules/validate');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const PartialLogin = require('./PartialLogin');
const { startPayAndPlayDepositSchema } = require('./api-schemas');
const { getBrandInfo } = require('../settings');

const testPayAndPlayDepositSchema = startPayAndPlayDepositSchema.append({
  testParameters: joi.object().optional(),
})

const testPartialLoginHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('testPartialLoginHandler', { params: req.params, body: req.body });

    const { brandId }: { brandId: BrandId } = (req.params: any);
    const {
      urls,
      client,
      amount,
      paymentMethod,
      transactionKey,
      player: playerDraft,
      testParameters,
    } = await validate(req.body, testPayAndPlayDepositSchema, 'Invalid partial player draft');
    const p = { ...playerDraft, brandId };

    const deposit = await PartialLogin.create(pg, {
      transactionKey,
      amount,
      paymentMethod,
      ...playerDraft,
    });
    const brandInfo = await getBrandInfo(brandId);
    const registerRequest = {
      player: {
        brandId,
        username: uuid(),
        languageId: p.languageId,
        currencyId: p.currencyId,
        countryId: p.countryId,
      },
      deposit: {
        ...deposit,
      },
      brand: brandInfo,
      urls,
      client,
    };

    if (testParameters) await PartialLogin.updateParams(pg, transactionKey, testParameters);

    return res.json(registerRequest);
  } catch (e) {
    logger.error('testPartialLoginHandler', { e, params: req.params, body: req.body });
    return next(e);
  }
};
module.exports = { testPartialLoginHandler };
