/* @flow */
import type { BriteConfig } from '../../types';

const { map } = require('lodash');
const joi = require('gstech-core/modules/joi');
const config = require('../../../config');

const briteCallbackSchema: any = joi
  .object()
  .keys({
    merchantId: joi
      .string()
      .trim()
      .required()
      .valid(...map<BriteConfig, any, string>(config.providers.brite, 'merchantId')),
    transactionId: joi.string().trim(),
    transactionState: joi.when('transactionId', {
      is: joi.exist(),
      then: joi.number().valid(2, 3, 4, 5, 6, 7).required(),
      otherwise: joi.forbidden(),
    }),
    sessionId: joi.string().trim(),
    sessionState: joi.when('sessionId', {
      is: joi.exist(),
      then: joi.number().valid(2, 10, 11, 12).required(),
      otherwise: joi.forbidden(),
    }),
  })
  .xor('transactionId', 'sessionId')
  .options({ stripUnknown: true });

module.exports = {
  briteCallbackSchema,
};
