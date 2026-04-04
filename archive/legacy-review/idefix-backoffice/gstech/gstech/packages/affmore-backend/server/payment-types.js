// @flow
import type { CreditPaymentType, DebitPaymentType } from '../types/repository/payments';

const creditTypes: CreditPaymentType[] = ['Commission', 'Extra Commission', 'Fixed fee', 'CPA', 'Manual'];
const debitTypes: DebitPaymentType[] = ['Payment', 'Tax'];
const paymentTypes: (CreditPaymentType | DebitPaymentType)[] = [...creditTypes, ...debitTypes];

module.exports = {
  paymentTypes,
  creditTypes,
  debitTypes,
};
