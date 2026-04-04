/* @flow */
import type { CMoney } from 'gstech-core/modules/money-class';
import type { Journey } from '../api';

const configuration = require('../configuration');

export type FeeCalculation = {
  fee: (journey: Journey) => ?number;
};

const getDepositFee = (journey: Journey, paymentMethod: string): number => {
  if (configuration.paymentFees != null && configuration.paymentFees[paymentMethod] != null) {
    const method: FeeCalculation = configuration.paymentFees[paymentMethod];
    return method.fee(journey) || 0;
  }
  return 0;
};

const calculateDepositFee = (journey: Journey, paymentMethod: string, amount: CMoney): CMoney => {
  const feePercent = getDepositFee(journey, paymentMethod) || 0;
  const fee = amount.multiply(feePercent).divide(100);
  return fee;
};

module.exports = { calculateDepositFee, getDepositFee };
