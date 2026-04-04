/* @flow */
const _ = require('lodash');

// parse values from bonus code (eg. LD_extra_riseofmaya_100ms, CJ_deposit_b14_spinata5super_new)
const parseBonusCode = (bonusCode: string): { spinCount: number, spinType: string } => {
  const removedTrailingNew = _.replace(bonusCode, /_?new\d?$/, '');
  const bonusValues = removedTrailingNew.split('_').pop();
  if (!bonusValues) throw new Error(`parseBonusCode::FAILED '${bonusCode}'`);
  return {
    spinCount: parseInt(bonusValues.replace(/\D/g, ''), 10),
    spinType: _.last(_.split(bonusValues, /\d{1,3}/g)),
  };
};

module.exports = {
  parseBonusCode,
};
