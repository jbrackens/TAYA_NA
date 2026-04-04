/* @flow */

import type { AudienceRule, AudienceRuleDraft } from '../../../../types/common';

const mapMinutesFrom = (rule: AudienceRule): AudienceRule =>
  rule.operator === 'minutesFrom' ? { ...rule, operator: 'withinMinutes', not: !rule.not } : rule;

const mergeDepositRules = (
  audienceRules: AudienceRule[] | AudienceRuleDraft[],
): Array<AudienceRule | AudienceRuleDraft> => {
  let idx: number | null = null;
  return audienceRules.reduce<Array<AudienceRule | AudienceRuleDraft>>((acc, curr) => {
    if (['deposit', 'depositAmount'].includes(curr.name)) {
      if (idx === null) {
        idx = acc.push({ name: 'deposit', operator: 'deposit', values: [] }) - 1;
      }
      if (curr.name === 'deposit' && curr.not) {
        acc[idx].not = true;
        acc[idx].values.push({ ...curr, not: false });
      } else {
        acc[idx].values.push(curr);
      }
    } else {
      acc.push(curr);
    }
    return acc;
  }, []);
};

module.exports = {
  mapMinutesFrom,
  mergeDepositRules,
};
