/* @flow */
const pg = require('gstech-core/modules/pg');
const { allowsWithdrawals, bankAccount, placeholderBankAccount } = require('../../accounts/validate');
const { getPreviousDeposit } = require('../deposits/DepositInfo');

export type xxx = {
  description: string,
  methods: {
    id: string,
    method: string,
    paymentMethodId: Id,
    account: string,
    minWithdrawal: Money,
    maxWithdrawal: Money,
    withdrawals: boolean,
    kycChecked: boolean,
    requireVerification: boolean,
  }[],
};

const getWdMethods = async (playerId: Id, tx: Knex): Promise<xxx> => {
  const lastDeposit = await getPreviousDeposit(playerId).transacting((tx: any));

  const rawAccounts: any = await tx('accounts')
    .select(
      'accounts.id as id',
      'payment_methods.name as method',
      'accounts.paymentMethodId',
      'account',
      pg.raw('max("minWithdrawal") as "minWithdrawal"'),
      pg.raw('max("maxWithdrawal") as "maxWithdrawal"'),
      'accounts.withdrawals',
      'kycChecked',
      'payment_methods.requireVerification',
    )
    .innerJoin('players', 'players.id', 'accounts.playerId')
    .innerJoin('payment_methods', 'payment_methods.id', 'accounts.paymentMethodId')
    .innerJoin('payment_providers', {
      'payment_providers.paymentMethodId': 'payment_methods.id',
      'payment_providers.withdrawals': pg.raw('?', true),
      'payment_providers.active': pg.raw('?', true),
    })
    .innerJoin('payment_provider_limits', {
      'payment_provider_limits.brandId': 'players.brandId',
      'payment_provider_limits.currencyId': 'players.currencyId',
      'payment_provider_limits.paymentProviderId': 'payment_providers.id',
    })
    .where({
      'accounts.playerId': playerId,
      'accounts.withdrawals': true,
      'payment_methods.active': true,
      'accounts.active': true,
    })
    .groupBy('accounts.id')
    .groupBy('payment_methods.id');


  const result = rawAccounts.filter(account => account.withdrawals && allowsWithdrawals(account));
  if (lastDeposit != null && lastDeposit.withdrawals) {
    // - Last deposit account, if done to account (method+provider) allowing wds
    if (placeholderBankAccount(lastDeposit)) {
      // if placeholder bank account, any verified account with same method
      const acc = rawAccounts.filter(account => bankAccount(account)).filter(x => x.paymentMethodId === lastDeposit.paymentMethodId);
      if (acc.length === 0) {
        return { description: 'Unable to process withdrawal to placeholder bank account. New account must be registered.', methods: [] };
      }
      return { description: 'Withdrawal possible to the same payment method where the deposit originated from.', methods: acc };
    }
    if (allowsWithdrawals(lastDeposit)) {
      const matchingAccount = result.filter(x => x.id === lastDeposit.accountId);
      const verifiedMatching = matchingAccount.filter(account => !placeholderBankAccount(account)).filter(account => account.kycChecked);
      if (verifiedMatching.length === 0) {
        return {
          description: `Latest deposit method (${lastDeposit.method} ${lastDeposit.account}) supports withdrawals, but account is not verified. Withdrawal is not currently possible.`,
          methods: [],
        };
      }
      return { description: `Withdrawal possible only to same payment account (${lastDeposit.method} ${lastDeposit.account}) where the deposit originated from.`, methods: verifiedMatching };
    }
  }
  const verified = rawAccounts.filter(account => allowsWithdrawals(account)).filter(account => account.kycChecked);
  if (lastDeposit != null) {
    return {
      description: `Withdrawal is not possible to the latest deposit method (${lastDeposit.method} ${lastDeposit.account}). Withdrawal allowed to any verified payment method.`,
      methods: verified.filter(x => x.id !== lastDeposit.accountId),
    };
  }
  if (verified.length > 0) {
    return { description: 'No latest deposit method. Withdrawal is allowed to any verified payment method.', methods: verified };
  }
  return { description: 'No verified payment methods - withdrawal is not possible.', methods: verified };
};

module.exports = { getWdMethods };
