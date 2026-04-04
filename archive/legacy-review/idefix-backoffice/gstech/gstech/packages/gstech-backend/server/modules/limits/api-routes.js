/* @flow */
import type { Limit } from 'gstech-core/modules/types/limits';

const moment = require('moment-timezone');
const joi = require('gstech-core/modules/joi');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const Limits = require('./Limit');
const Session = require('../sessions/Session');
const Player = require('../players/Player');
const { depositLimitRemaining, getActiveCounters } = require('./Counter');

const getExclusionsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const limits = await Limits.getActives(req.session.playerId);
    const result = await Promise.all(limits.map(async (limit: Limit): Promise<Limit> => {
      const coolOffPeriod = (limit.permanent || limit.type === 'exclusion') ? 7 : 1;
      const canBeCancelled =
        (!limit.isInternal && limit.expires == null && limit.permanent) ||
        moment(limit.expires).isAfter(moment().add(coolOffPeriod, 'days'));
      switch(limit.type) {
        case 'deposit_amount': {
          const depositLimit = await depositLimitRemaining(req.session.playerId);
          return { ...limit, limitLeft: depositLimit, limitDate: null, canBeCancelled };
        }
        case 'session_length': {
          const session = await Session.get(req.session.playerId, req.session.id);
          return { ...limit,
            limitLeft: limit.limitValue ? Math.max(0, Math.floor(limit.limitValue - session.playTimeInMinutes)) : null,
            limitDate: moment(session.timestamp).add(limit.limitValue, 'minutes'),
            canBeCancelled,
          };
        }
        case 'loss': {
          const [lossCounter] = await getActiveCounters(req.session.playerId, ['loss'], true);
          return { ...limit, limitLeft: lossCounter.limit - lossCounter.amount, limitDate: null, canBeCancelled };
        }
        case 'bet': {
          const [betCounter] = await getActiveCounters(req.session.playerId, ['bet'], true);
          return { ...limit, limitLeft: betCounter.limit - betCounter.amount, limitDate: null, canBeCancelled };
        }
        default:
            return { ...limit, limitLeft: null, limitDate: null, canBeCancelled };
      }
    }))
    return res.json({ result });
  } catch (e) {
    return next(e);
  }
};

const createExclusionSchema = joi
  .object({
    type: joi
      .string()
      .trim()
      .valid('exclusion', 'deposit_amount', 'bet', 'loss', 'session_length', 'timeout')
      .default('exclusion'),
    permanent: joi.boolean().default(false),
    days: joi.number().positive(),
    reason: joi.string().trim().required(),
    periodType: joi.string().trim().valid('monthly', 'weekly', 'daily').optional(),
    limitValue: joi.number().positive().integer().optional(),
    isInternal: joi.boolean().default(false),
  })
  .or('permanent', 'days');

const createExclusionHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('createExclusionHandler', { body: req.body });
    const exclusion = await validate(req.body, createExclusionSchema, 'Create exclusion validation failed');
    const { permanent, days, type, periodType, limitValue, isInternal } = exclusion;
    const expires = permanent ? null : moment().add(days, 'days').toDate();
    try {
      const result = await Limits.create({ playerId: req.session.playerId, permanent, expires, reason: exclusion.reason, type, limitValue, userId: null, periodType, isInternal });
      return res.json({ result });
    } catch (e) {
      if (e.error != null) {
        return res.status(400).json(e);
      }
      return next(e);
    }
  } catch (e) {
    return next(e);
  }
};

const cancelExclusionHandlerSchema = joi.object({
  exclusionKey: joi.string().trim().uuid().required(),
}).required().options({ stripUnknown: true });

const cancelExclusionSchema = joi.object({
  reason: joi.string().trim().default('Player requested'),
}).required().options({ stripUnknown: true });

const cancelExclusionHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { exclusionKey } = await validate({ exclusionKey: req.params.exclusionKey }, cancelExclusionHandlerSchema, 'Cancel exclusion validation failed');
    const { reason } = await validate(req.body, cancelExclusionSchema, 'Cancel exclusion validation failed');
    try {
      const limit = await Limits.getByExclusionKey(exclusionKey);
      if (limit) {
        if (limit.isInternal) {
          throw new Error('Cannot remove internal limit');
        }
        const { preventLimitCancel } = await Player.getAccountStatus(limit.playerId);
        if (preventLimitCancel) {
          throw new Error('User is prevented from cancelling limits');
        }
      }

      const exclusion = await Limits.cancel(exclusionKey, true, reason);
      return res.json({ exclusion });
    } catch (e) {
      if (e.error != null) {
        return res.status(400).json(e);
      }
      return next(e);
    }
  } catch (e) {
    logger.warn('Exclusion.cancel failed', e);
    return next(e);
  }
};

module.exports = { getExclusionsHandler, createExclusionHandler, cancelExclusionHandler };
