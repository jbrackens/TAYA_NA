/* @flow */
import type { Money } from 'gstech-core/modules/money-class';
import type { Authentication } from './api';

const client = require('./client');
const logger = require('./logger');

const authentication = (req: Authentication): { Authorization?: string } => {
  const r = (req: any);
  if (req.session && req.session.SessionKey)
    return { Authorization: `Token ${r.session.SessionKey}` };
  if (req.session && req.session.username) return { Authorization: `Bearer ${r.session.username}` };
  if (req.user && req.user.username) return { Authorization: `Bearer ${r.user.username}` };
  logger.warn('Unable to create authentication', req.user, req.session);
  return {};
};

module.exports = {
  authentication,
  PromotionOptInPromotion(req: Authentication, values: { promotionID: string }): Promise<any> {
    return client.execute(`promotions/${values.promotionID}`, 'POST', {}, authentication(req));
  },

  TransactionAdjustRealMoney(req: Authentication, values: { transactionType: 'Compensation' | 'Correction', reason: string, amount: Money }): Promise<any> {
    return client.execute(
      'transaction',
      'POST',
      {
        amount: values.amount,
        transactionType: values.transactionType === 'Correction' ? 'correction' : 'compensation',
        reason: values.reason,
      },
      authentication(req),
    );
  },
};
