/* @flow */
import type { APIBonus, Bonus } from '../../api';

const { formatMoney, money } = require('../../money');

const mapBonuses = (req: express$Request, bonuses: APIBonus[]): Bonus[] => {
  const rules = bonuses.map(bonusRule => ({
    id: bonusRule.BonusRuleID,
    activeBonus: bonusRule.Name,
    minAmount: formatMoney(bonusRule.BonusMinDepositAmount),
    maxAmount: formatMoney(bonusRule.BonusPercentageMaxAmount),
    maxBonus: formatMoney(bonusRule.BonusPercentageMaxAmount * parseFloat(bonusRule.Percentage)),
    percentage: parseFloat(bonusRule.Percentage),
    bonusPercentage: `${Math.round(100 * parseFloat(bonusRule.Percentage))}%`,
    bonusMinAmount: money(req, bonusRule.BonusMinDepositAmount, bonusRule.CurrencyCode, false),
    bonusMaxAmount: money(req, bonusRule.BonusPercentageMaxAmount, bonusRule.CurrencyCode, false),
    bonusMaxValue: money(req, bonusRule.BonusPercentageMaxAmount * parseFloat(bonusRule.Percentage), bonusRule.CurrencyCode, false),
    wageringRequirement: bonusRule.Wagering,
  }));
  return rules;
};

module.exports = { mapBonuses };
