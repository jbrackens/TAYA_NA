/* @flow */
import type { CMoney } from 'gstech-core/modules/money-class';
import type { WageringCounter } from '../../limits/Counter'

const { DateTime } = require('luxon');
const { Money } = require('gstech-core/modules/money-class');
const { getCurrencies } = require('../../settings/Currencies');
const Payment = require('../Payment');

const feeSettings = {
  CJ: {
    freeWithdrawalsPerMonth: 1,
    withdrawalFee: 3,
    withdrawalFeeMin: 250,
    withdrawalFeeMax: 2500,
    notWageredFee: {
      withdrawalFee: 5,
      withdrawalFeeMin: 1000,
    },
  },
  FK: {
    freeWithdrawalsPerMonth: 1,
    withdrawalFee: 0,
    withdrawalFeeMin: 0,
    withdrawalFeeMax: Number.MAX_SAFE_INTEGER,
    notWageredFee: {
      withdrawalFee: 5,
      withdrawalFeeMin: 1000,
    },
  },
  KK: {
    freeWithdrawalsPerMonth: 1,
    withdrawalFee: 3,
    withdrawalFeeMin: 250,
    withdrawalFeeMax: 2500,
    notWageredFee: {
      withdrawalFee: 5,
      withdrawalFeeMin: 1000,
    },
  },
  LD: {
    freeWithdrawalsPerMonth: 1,
    withdrawalFee: 3,
    withdrawalFeeMin: 250,
    withdrawalFeeMax: 2500,
    notWageredFee: {
      withdrawalFee: 5,
      withdrawalFeeMin: 1000,
    },
  },
  OS: {
    freeWithdrawalsPerMonth: 1,
    withdrawalFee: 3,
    withdrawalFeeMin: 250,
    withdrawalFeeMax: 2500,
    notWageredFee: {
      withdrawalFee: 5,
      withdrawalFeeMin: 1000,
    },
  },
  SN: {
    freeWithdrawalsPerMonth: 1,
    withdrawalFee: 0,
    withdrawalFeeMin: 0,
    withdrawalFeeMax: Number.MAX_SAFE_INTEGER,
    notWageredFee: {
      withdrawalFee: 5,
      withdrawalFeeMin: 1000,
    },
  },
  VB: {
    freeWithdrawalsPerMonth: 1,
    withdrawalFee: 3,
    withdrawalFeeMin: 150,
    withdrawalFeeMax: 2000,
    notWageredFee: {
      withdrawalFee: 5,
      withdrawalFeeMin: 1000,
    },
  },
};

const getWithdrawalFeeConfiguration = async (brandId: BrandId, playerId: Id, currencyId: CurrencyId, counters: WageringCounter[]): Promise<
      ?{
        withdrawalFee: number,
        withdrawalFeeMax: number,
        withdrawalFeeMin: number,
      }> => {
  const startOfMonth = DateTime.local().startOf('month');
  const setting = feeSettings[brandId];
  const { notWageredFee } = setting;

  const withdrawalTransactions = await Payment.payments(
    playerId,
    undefined,
    ['created', 'pending', 'complete', 'settled', 'accepted', 'processing'],
    { from: startOfMonth.toJSDate() },
  ).where({ paymentType: 'withdraw' });

  const currencies = await getCurrencies(brandId);
  const { defaultConversion = 1 } = currencies.find(c => c.id === currencyId) || { };

  const hasCounters = counters.length > 0;

  if (hasCounters) {
    return {
      withdrawalFee: notWageredFee.withdrawalFee || setting.withdrawalFee,
      withdrawalFeeMin: (notWageredFee.withdrawalFeeMin || setting.withdrawalFeeMin) * defaultConversion,
      withdrawalFeeMax: Number.MAX_SAFE_INTEGER,
    };
  }

  return withdrawalTransactions.length >= setting.freeWithdrawalsPerMonth ? {
    withdrawalFee: setting.withdrawalFee,
    withdrawalFeeMin: setting.withdrawalFeeMin * defaultConversion,
    withdrawalFeeMax: setting.withdrawalFeeMax * defaultConversion,
  } : undefined;
};

const calculateWithdrawalFee = async (brandId: BrandId, playerId: Id, amount: CMoney, currencyId: CurrencyId, counters: WageringCounter[]): Promise<CMoney> => {
  const withdrawalFeeConfiguration = await getWithdrawalFeeConfiguration(brandId, playerId, currencyId, counters);
  const fee = withdrawalFeeConfiguration ?
    amount.multiply(withdrawalFeeConfiguration.withdrawalFee)
      .divide(100)
      .min(amount.withValue(withdrawalFeeConfiguration.withdrawalFeeMax))
      .max(amount.withValue(withdrawalFeeConfiguration.withdrawalFeeMin)) :
    new Money(0, currencyId);

  return fee;
};

module.exports = {
  getWithdrawalFeeConfiguration,
  calculateWithdrawalFee,
};
