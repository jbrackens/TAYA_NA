/* @flow */
import type { ExtendedBalance } from './types';

const { money } = require('../../money');

const mapBalance = (req: express$Request, r: any): ExtendedBalance => {
  const result: ExtendedBalance = r;
  const totalBalance = parseInt(result.CurrentBonusBalance) + parseInt(result.CurrentRealBalance);
  result.ui = {
    CurrentBonusBalance: money(req, result.CurrentBonusBalance, result.CurrencyISO),
    CurrentRealBalance: money(req, result.CurrentRealBalance, result.CurrencyISO),
    CurrentTotalBalance: money(req, totalBalance, result.CurrencyISO),
    BareTotalBalance: money(req, totalBalance, ' ').trim(),
    ActivationNeeded: !req.user.details.Activated && parseInt(result.NumDeposits) > 0,
    Activated: req.user.details.Activated,
  };
  return result;
};

module.exports = {
  mapBalance,
};
