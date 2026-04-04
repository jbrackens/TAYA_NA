// @flow
import type { Activity } from '../types/repository/activities';
import type { Revenue } from '../types/repository/affiliates';

const _ = require('lodash');
const { affmoreBrands } = require('../types/constants');

const groupActivitiesByBrand = (
  activities: Activity[],
  predicate: (activity: Activity) => Money,
): { [BrandId]: Money } => {
  const commissions = Object.entries(
    _.groupBy<BrandId, Activity>(activities, (a: Activity) => a.brandId),
  ).map((x: any) => ({
    [x[0]]: _.sumBy(x[1], predicate),
  }));

  return Object.assign({}, ...commissions);
};

const sumBrandCommissions = (revenues: Revenue[]): { [BrandId]: Money } => {
  const initial = Object.assign({}, ...affmoreBrands.map((b: any) => ({ [b.id]: 0 })));
  return revenues.map((r) => r.commissions)
    .reduce(
      (a, c) => {
        const keys = Object.keys(c);
        const values = keys.map((k: any) => ({ [k]: c[k] + a[k] }));
        return Object.assign({}, ...values);
      },
      initial,
    );
};

const calculateZeroFlooredCommission = (
  commission: { [BrandId]: Money },
  floorBrandCommission: boolean,
): Money =>
  Math.max(
    0,
    Object.values(commission).reduce(
      (a, c: any) => a + (floorBrandCommission ? Math.max(0, c) : c),
      0,
    ) || 0,
  ) || 0;

const calculateTax = (amount: Money, countryId: CountryId): { amount: Money, tax: Money, taxRate: number, total: Money, } => {
  let taxRate = 0;
  if (countryId === 'MT') {
    taxRate = 18;
  }

  const tax = Math.round(amount * taxRate / 100);

  return { amount, tax, taxRate, total: amount + tax };
}

module.exports = {
  groupActivitiesByBrand,
  sumBrandCommissions,
  calculateZeroFlooredCommission,
  calculateTax,
};
