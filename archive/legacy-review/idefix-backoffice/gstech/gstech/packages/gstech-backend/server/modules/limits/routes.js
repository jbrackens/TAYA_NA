/* @flow */
import type { Limit, FullLimit } from "gstech-core/modules/types/limits";

const moment = require('moment-timezone');
const isNumber = require('lodash/isNumber');
const find = require('lodash/find');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const { formatExclusion, formatLimit, formatSessionLength } = require('./format');
const { getLimitsWithCounters, get, create, cancel, raise } = require('./Limit');
const { formatMoney } = require('../core/money');
const { setLimitSchema, raiseLimitSchema, cancelLimitSchema } = require('./schemas');
const Player = require('../players/Player');

const mapLimit = (limit: void | Limit, format: ((limit: ?any) => string) | ((limit: ?any) => null | string)) => limit && ({
  ...limit,
  display: format(limit),
  canBeCancelled: (limit.expires == null && limit.permanent) || moment(limit.expires).subtract(1, 'days').isAfter(moment()),
  cancellationDays: (limit.permanent || limit.type ==='exclusion') ? 7 : 1,
});

const getActiveLimits = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const limits = await getLimitsWithCounters(playerId);
    const { currencyId } = await Player.getBalance(playerId);
    const result = {
      selfExclusion: mapLimit(find(limits, { type: 'exclusion' }), formatExclusion),
      deposit: mapLimit(find(limits, { type: 'deposit_amount' }), formatLimit(currencyId)),
      bet: mapLimit(find(limits, { type: 'bet' }), formatLimit(currencyId)),
      loss: mapLimit(find(limits, { type: 'loss' }), formatLimit(currencyId)),
      sessionLength: mapLimit(find(limits, { type: 'session_length' }), formatSessionLength),
      timeout: mapLimit(find(limits, { type: 'timeout' }), formatExclusion),
    };
    return res.status(200).json(result);
  } catch (err) {
    logger.error('Get active limits failed', err);
    return next(err);
  }
};

const typeMap = {
  selfExclusion: 'exclusion',
  deposit: 'deposit_amount',
  sessionLength: 'session_length',
  bet: 'bet',
  loss: 'loss',
  timeout: 'timeout',
};

const setLimit = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const { type, values } = await validate(req.body, setLimitSchema, 'Set limit failed');

    const limit = await create({
      playerId,
      permanent: !!(values.duration === 'indefinite'),
      expires: isNumber(values.duration) ? moment().add(values.duration, 'days').toDate() : undefined,
      reason: values.reason,
      type: typeMap[type],
      limitValue: values.limit,
      periodType: values.period,
      userId: req.userSession.id,
      isInternal: values.isInternal,
    });

    return res.status(200).json(limit);
  } catch (err) {
    logger.error('Set limit failed', err);
    return next(err);
  }
};

const displayTypeMap = {
  exclusion: 'Self exclusion',
  deposit_amount: 'Deposit',
  session_length: 'Maximum play time',
  bet: 'Bets',
  loss: 'Losses',
  timeout: 'Timeout',
};

const getStatus = (limit: FullLimit) => {
  if (!limit.active) {
    return `Cancelled ${moment(limit.cancelled).format('DD.MM.YYYY HH:mm')}`;
  }

  if (moment(limit.expires).isBefore(moment())) {
    return 'Expired';
  }

  return 'Active';
};

const getLimits = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const limits = await get(Number(req.params.playerId)).orderBy('active', 'desc').orderBy('createdAt', 'desc');
    const { currencyId } = await Player.getBalance(Number(req.params.playerId));
    const history = limits
      .map(limit => ({
        type: displayTypeMap[limit.type],
        periodType: limit.periodType,
        status: getStatus(limit),
        startTime: moment(limit.createdAt).format('DD.MM.YYYY HH:mm'),
        endTime: limit.permanent && !limit.expires ? 'Permanent' : moment(limit.expires).format('DD.MM.YYYY HH:mm'),
        amount: limit.type === 'session_length' ? limit.limitValue : formatMoney(((limit.limitValue: any): Money), currencyId),
        reason: limit.reason,
        isInternal: limit.isInternal,
      }));

    return res.status(200).json(history);
  } catch (err) {
    logger.error('Get limits failed', err);
    return next(err);
  }
};

const cancelLimit = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { delay, reason } = await validate(req.body, cancelLimitSchema, 'Cancel failed');
    const { exclusionKey } = req.params;
    const limitExpires = await cancel(exclusionKey, delay, reason, req.userSession.id);
    return res.status(200).json(limitExpires);
  } catch (err) {
    logger.error('Cancel limit failed', err);
    return next(err);
  }
};

const raiseLimit = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { reason, limit, period } = await validate(req.body, raiseLimitSchema, 'Raise limit failed');
    const { playerId, limitId } = req.params;
    const newLimit = await raise(Number(playerId), Number(limitId), limit, reason, period, req.userSession.id);
    return res.status(200).json(newLimit);
  } catch (err) {
    logger.error('Raise limit failed', err);
    return next(err);
  }
};

module.exports = {
  getActiveLimits,
  getLimits,
  setLimit,
  cancelLimit,
  raiseLimit,
};
