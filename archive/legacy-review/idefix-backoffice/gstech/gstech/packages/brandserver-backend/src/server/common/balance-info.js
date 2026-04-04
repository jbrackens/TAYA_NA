/* @flow */
import type { Balance } from './modules/balance/types';

const configuration = require('./configuration');

const vars = configuration.requireProjectFile('./data/currency-vars.json');

class BalanceInfo {
  balance: Balance;

  constructor(balance: Balance) {
    // $FlowFixMe[method-unbinding]
    (this: any).isDepleted = this.isDepleted.bind(this);
    // $FlowFixMe[method-unbinding]
    (this: any).hasActiveBonusMoney = this.hasActiveBonusMoney.bind(this);
    this.balance = balance;
  }

  isDepleted(minDeposits: number = 1): boolean {
    return parseInt(this.balance.NumDeposits) >= minDeposits && (vars[this.balance.CurrencyISO].depletion || 5) * 100 > parseInt(this.balance.CurrentBonusBalance) + parseInt(this.balance.CurrentRealBalance);
  }

  hasActiveBonusMoney(): boolean {
    return parseInt(this.balance.CurrentBonusBalance) > 0;
  }
}

module.exports = { BalanceInfo };
