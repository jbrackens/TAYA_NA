/* @flow */
import type { Limit } from 'gstech-core/modules/types/limits';

const moment = require('moment-timezone');
const limitsClient = require('gstech-core/modules/clients/backend-limits-api');
const validate = require('gstech-core/modules/validate');
const joi = require('joi');
const _ = require('lodash');
const logger = require('../logger');
const { handleError } = require('../extensions');
const { money } = require('../money');
const { localize } = require('./localize');
const legacyApi = require('../api');
const configuration = require('../configuration');

const brandId = configuration.shortBrandId();

const limitTypeMapper = {
  'deposit': 'deposit_amount',
  'play': 'session_length',
  'pause': 'exclusion',
  'bet': 'bet',
};

const INDEFINITE_SELF_EXCLUSION = 9999;

const setLimitSchema = joi.object().keys({
  limitLength: joi.number().positive().integer().required(),
  limitType: joi.string().trim().valid('loss', 'deposit', 'play', 'timeout', 'pause', 'bet').required(),
  limitPeriodType: joi.when('limitType', {
    is: joi.string().trim().valid('loss', 'deposit', 'bet'),
    then: joi.string().trim().valid('monthly', 'weekly', 'daily').required(),
    otherwise: joi.forbidden(),
  }),
  limitValue: joi.when('limitType', {
    is: joi.string().trim().valid('loss', 'deposit', 'play', 'bet'),
    then: joi.number().positive().integer().required(),
    otherwise: joi.forbidden(),
  }),
})
.options({ stripUnknown: true });

const removeLimitSchema = joi.object().keys({
  limitId: joi.string().trim().required(),
}).options({ stripUnknown: true });


const invertedLimitTypeMapper = _.invert(limitTypeMapper);

const removeLimitHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { user: { username } } = req;
    const { limitId } = validate(req.params, removeLimitSchema, 'remove limit schema validation failed');

    const body = {
      reason: 'Player removes limit',
    };
    const result = await limitsClient.removeLimit(brandId, username, limitId, body);
    const { result: limits } = await limitsClient.getLimits(brandId, username);
    const limit = limits.find(r => r.exclusionKey === result.exclusion.exclusionKey) || { };

    return res.json({
      limitId,
      expires: result.exclusion.expires,
      limitType: invertedLimitTypeMapper[limit.type] || limit.type,
      limitPeriodType: limit.periodType,
      limitValue: limit.limitValue,
      limitLeft: limit.limitLeft,
      limitDate: limit.limitDate,
      isPermanent: limit.permanent,
      canBeCancelled: limit.canBeCancelled,
      isInternal: limit.isInternal,
    });
  } catch (e) {
    return handleError(req, res, e);
  }
};

const removeLimitAnonymouslyHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { limitId } = validate(req.params, removeLimitSchema, 'remove limit schema validation failed');

    const body = {
      reason: 'Player removes limit',
    };
    await limitsClient.removeLimit(brandId, '', limitId, body);

    return res.json({
      ok: true,
    });
  } catch (e) {
    return handleError(req, res, e);
  }
};

const setLimitHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { user: { username } } = req;

    const request = validate(req.body, setLimitSchema, 'set limit schema validation failed');

    const body = {
      type: limitTypeMapper[request.limitType] || request.limitType,
      permanent:
        limitTypeMapper[request.limitType] === 'exclusion' &&
        request.limitLength === INDEFINITE_SELF_EXCLUSION,
      days: request.limitLength,
      reason: 'Player sets a limit',
      periodType: request.limitPeriodType,
      limitValue: request.limitValue,
    };

    logger.debug({ username, request, body });

    const { result: [result] } = await limitsClient.setLimit(brandId, username, body);
    const { result: limits } = await limitsClient.getLimits(brandId, username);
    const limit = limits.find(r => r.exclusionKey === result.exclusionKey) || { };

    return res.json({
      limitId: result.exclusionKey,
      expires: result.expires,
      limitType: invertedLimitTypeMapper[limit.type] || limit.type,
      limitPeriodType: limit.periodType,
      limitValue: limit.limitValue,
      limitLeft: limit.limitLeft,
      limitDate: limit.limitDate,
      isPermanent: limit.permanent,
      canBeCancelled: limit.canBeCancelled,
      isInternal: limit.isInternal,
    });
  } catch (e) {
    return handleError(req, res, e);
  }
};

const getLimitsHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { user } = req;
    const { result } = await limitsClient.getLimits(brandId, user.username);
    const { depositMethods } = await legacyApi.TransactionGetAllDepositMethods({ sessionKey: req.session.SessionKey });
    let minDepositLimit = 0;
    if (depositMethods.length) {
      const method = _.minBy(depositMethods, d => d.PlayerLowerLimit);
      minDepositLimit = method.PlayerLowerLimit;
    }

    const limits = result.map(r => ({
      limitId: r.exclusionKey,
      expires: r.expires,
      limitType: invertedLimitTypeMapper[r.type] || r.type,
      limitPeriodType: r.periodType,
      limitValue: r.limitValue,
      limitLeft: r.limitLeft,
      limitDate: r.limitDate,
      isPermanent: r.permanent,
      isInternal: r.isInternal,
      canBeCancelled: r.canBeCancelled,
    }));

    return res.json({
      minDepositLimit,
      limits,
    });
  } catch (e) {
    return handleError(req, res, e);
  }
};

const hasDefaultLimit = async (req: express$Request): Promise<boolean> => {
  const { result: limits } = await limitsClient.getLimits(brandId, req.user.username);
  const internalLimits = limits.filter((limit) => limit.type === 'deposit_amount');
  return internalLimits.length > 0;
}

const formatLimit = (req: express$Request, limit: Limit): string =>
  localize(req, `my-account.deposit.limit-${limit.periodType || ''}`, { amount: money(req, limit.limitValue || 0, req.context.currencyISO, false) }) || '';

const getDepositLimits = async (req: express$Request, limit: ?Limit): Promise<
    ?{
      canBeCancelled: any | boolean,
      description: string,
      expireTime: any | null,
      expires: Date,
      isInternal: boolean,
      key: UUID,
      limitLeft: ?number,
      permanent: boolean,
    }> => {
  if (limit) {
    return {
      key: limit.exclusionKey,
      description: formatLimit(req, limit),
      canBeCancelled: !limit.isInternal && (limit.permanent && limit.expires === null) || moment(limit.expires).isAfter(moment().add( (limit.permanent || limit.type === 'exclusion') ? 7 : 1, 'day')),
      isInternal: limit.isInternal,
      expireTime: limit.expires ? moment(limit.expires).utcOffset(-parseInt(req.body.tz)).format('D.M.YYYY, H:mm') : null, // TODO: remove when client updated
      expires: limit.expires,
      permanent: limit.permanent,
      limitLeft: limit.limitValue && limit.limitValue - limit.amount,
    };
  }
};

module.exports = {
  removeLimitHandler,
  removeLimitAnonymouslyHandler,
  hasDefaultLimit,
  setLimitHandler,
  getLimitsHandler,
  getDepositLimits,
}
